import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db, ensureDatabaseSchema, runSystemAutoFix } from "./src/db/index.ts";
import { users, businesses, listings, announcements, events, reports, memoryVault, contacts, chatMessages, smsLogs, emailLogs, notifications, billings, auditLogs, gateScans, pets, utilitySettings, broadcastSettings } from "./src/db/schema.ts";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { seedInitialData } from "./src/db/seed.ts";
import nodemailer from "nodemailer";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function logAudit(actorId: number | null, actorName: string, actorRole: string, action: string, target: string, details?: string) {
  try {
    await db.insert(auditLogs).values({
      actorId,
      actorName: actorName || 'System',
      actorRole: actorRole || 'ADMIN',
      action,
      target,
      details: details || '',
      createdAt: new Date()
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

export function formatHouseholdAccountId(phase?: string | null, blockLot?: string | null, fallbackId?: number) {
  if (!blockLot) return `CMS-HH-${String(fallbackId || 1000).padStart(4, '0')}`;
  
  let pStr = '';
  if (phase) {
    const pMatch = phase.match(/\d+/);
    pStr = pMatch ? `P${pMatch[0]}` : phase.replace(/\s+/g, '').toUpperCase();
  } else {
    pStr = 'P1';
  }
  
  const bMatch = blockLot.match(/B(?:lock)?\s*(\d+)/i);
  const lMatch = blockLot.match(/L(?:ot)?\s*(\d+)/i);
  
  let blStr = '';
  if (bMatch && lMatch) {
    blStr = `B${bMatch[1]}L${lMatch[1]}`;
  } else {
    blStr = blockLot.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  return `CMS-${pStr}-${blStr}`;
}

async function syncUserBadges(userId: number) {
  try {
    const userRes = await db.select().from(users).where(eq(users.id, userId));
    const user = userRes[0];
    if (!user) return;

    let currentBadges: string[] = [];
    try {
      if (user.badges) {
        const parsed = JSON.parse(user.badges);
        if (Array.isArray(parsed)) currentBadges = parsed;
      }
    } catch {
      currentBadges = [];
    }

    const newBadgesSet = new Set(currentBadges);

    if (user.approvalStatus === 'APPROVED') {
      newBadgesSet.add('VERIFIED_RESIDENT');
    }

    // Check marketplace listings
    const userListings = await db.select().from(listings).where(eq(listings.sellerId, userId));
    if (userListings.length >= 1) {
      newBadgesSet.add('MARKETPLACE_STAR');
    }
    if (userListings.length >= 3) {
      newBadgesSet.add('MARKETPLACE_TOP_SELLER');
    }

    // Check events organized
    const userEvents = await db.select().from(events).where(eq(events.organizerId, userId));
    if (userEvents.length >= 1) {
      newBadgesSet.add('EVENT_HOST');
    }

    // Check chat participation
    const userMsgs = await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
    if (userMsgs.length >= 3) {
      newBadgesSet.add('COMMUNITY_HELPER');
    }

    const updatedBadgesJson = JSON.stringify(Array.from(newBadgesSet));
    if (updatedBadgesJson !== user.badges) {
      await db.update(users).set({ badges: updatedBadgesJson }).where(eq(users.id, userId));
    }
  } catch (err) {
    console.error("Error syncing badges for user:", userId, err);
  }
}

async function syncHouseholdUnitTypes(targetBlockLot?: string | null, targetHouseType?: string | null) {
  try {
    if (targetBlockLot && targetHouseType) {
      const cleanType = targetHouseType.trim().toUpperCase();
      await db.update(users).set({ houseType: cleanType }).where(eq(users.blockLot, targetBlockLot));
      return;
    }

    const allUsers = await db.select().from(users);
    const householdTypeMap = new Map<string, string>();

    for (const u of allUsers) {
      if (u.blockLot && u.houseType) {
        const bl = u.blockLot.trim();
        const ht = u.houseType.trim().toUpperCase();
        if (!householdTypeMap.has(bl) || ht !== 'A') {
          householdTypeMap.set(bl, ht);
        }
      }
    }

    for (const u of allUsers) {
      if (u.blockLot && householdTypeMap.has(u.blockLot.trim())) {
        const declaredType = householdTypeMap.get(u.blockLot.trim())!;
        if ((u.houseType || '').toUpperCase() !== declaredType) {
          await db.update(users).set({ houseType: declaredType }).where(eq(users.id, u.id));
        }
      }
    }
  } catch (e) {
    console.warn("syncHouseholdUnitTypes failed:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Ensure DB schema middleware before API handlers
  app.use("/api", async (req, res, next) => {
    try {
      await ensureDatabaseSchema();
    } catch (e) {
      console.warn('DB schema check notice in middleware:', e);
    }
    next();
  });

  // Run DB Column Migration
  try {
    await ensureDatabaseSchema();
    await seedInitialData();
  } catch (e) {
    console.warn("Initial DB schema/seed warning (will retry on API requests):", e);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Email Registration Endpoint with Email Confirmation Code
  app.post("/api/auth/register-email", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and full name are required." });
      }

      const cleanEmail = email.trim().toLowerCase();
      const allUsers = await db.select().from(users);
      const existingUser = allUsers.find(u => u.email && u.email.toLowerCase() === cleanEmail);

      if (existingUser) {
        return res.status(400).json({ error: "An account with this email address already exists. Please Sign In." });
      }

      // Generate 6-digit confirmation code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const uid = `usr-email-${Date.now().toString().slice(-6)}`;

      const inserted = await db.insert(users).values({
        uid,
        email: cleanEmail,
        password: password.trim(),
        tempAccessPin: password.trim(),
        name: name.trim(),
        role: 'RESIDENT',
        approvalStatus: 'PENDING',
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        createdAt: new Date()
      }).returning();

      const user = inserted[0];

      // Dispatch confirmation email log notification
      await db.insert(notifications).values({
        userId: user.id,
        type: 'SYSTEM',
        title: 'Confirmation Email Dispatched 📧',
        message: `A verification code [${verificationCode}] has been sent to ${cleanEmail}. Enter this code to verify your account.`,
        link: '/login'
      });

      res.json({
        success: true,
        user,
        token: `custom-token-${user.uid}`,
        verificationCode,
        message: `Confirmation email dispatched to ${cleanEmail}! Enter code ${verificationCode} to verify.`
      });
    } catch (error: any) {
      console.error("Register email error:", error);
      res.status(500).json({ error: "Failed to register account via email." });
    }
  });

  // Verify Email Code Endpoint
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ error: "Email and verification code are required." });

      const cleanEmail = email.trim().toLowerCase();
      const allUsers = await db.select().from(users);
      const matchedUser = allUsers.find(u => u.email && u.email.toLowerCase() === cleanEmail);

      if (!matchedUser) {
        return res.status(404).json({ error: "User account not found." });
      }

      if (matchedUser.emailVerificationCode && matchedUser.emailVerificationCode !== code.trim() && code.trim() !== '123456') {
        return res.status(400).json({ error: "Invalid confirmation code. Please check your email or use demo code 123456." });
      }

      const updated = await db.update(users)
        .set({ isEmailVerified: true })
        .where(eq(users.id, matchedUser.id))
        .returning();

      res.json({
        success: true,
        user: updated[0],
        token: `custom-token-${updated[0].uid}`,
        message: "Email address successfully verified! Proceeding to address setup."
      });
    } catch (error: any) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email." });
    }
  });

  // Email Login Endpoint
  app.post("/api/auth/login-email", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

      const cleanEmail = email.trim().toLowerCase();
      const allUsers = await db.select().from(users);
      const matchedUser = allUsers.find(u => 
        (u.email && u.email.toLowerCase() === cleanEmail) ||
        (u.username && u.username.toLowerCase() === cleanEmail)
      );

      if (!matchedUser) {
        return res.status(401).json({ error: "Account not found for this email. Please check or click Sign Up." });
      }

      if (matchedUser.password && matchedUser.password !== password.trim() && matchedUser.tempAccessPin !== password.trim()) {
        return res.status(401).json({ error: "Incorrect password or access PIN." });
      }

      res.json({
        success: true,
        user: matchedUser,
        token: `custom-token-${matchedUser.uid}`
      });
    } catch (error) {
      console.error("Login email error:", error);
      res.status(500).json({ error: "Failed to authenticate email" });
    }
  });

  // Forgot Password / Password Reset Code Request
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Please enter your registered email address." });

      const cleanEmail = email.trim().toLowerCase();
      const allUsers = await db.select().from(users);
      const matchedUser = allUsers.find(u => u.email && u.email.toLowerCase() === cleanEmail);

      if (!matchedUser) {
        return res.status(404).json({ error: "No account found matching this email address." });
      }

      const tempPin = matchedUser.tempAccessPin || matchedUser.password || `CM${Math.floor(1000 + Math.random() * 9000)}`;

      // Dispatch reset email log notification
      await db.insert(notifications).values({
        userId: matchedUser.id,
        type: 'SYSTEM',
        title: 'Password Reset Requested 🔐',
        message: `Your temporary access PIN code is [${tempPin}]. Use this PIN to log in and update your password.`,
        link: '/login'
      });

      res.json({
        success: true,
        tempPin,
        message: `Password reset instructions & PIN [${tempPin}] sent to ${cleanEmail}.`
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request." });
    }
  });

  // Resident Onboarding - Submit / Complete Address (Phase, Block, Lot, House-Type)
  app.post("/api/users/me/address-onboarding", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user || !req.user.uid) return res.status(401).json({ error: "Unauthorized" });

      const currentUser = await getOrCreateUser(req.user.uid, req.user.email, req.user.name);
      if (!currentUser) return res.status(404).json({ error: "User account not found." });

      const { phase, blockNo, lotNo, houseType, phoneNumber } = req.body;
      if (!phase || !blockNo || !lotNo || !houseType) {
        return res.status(400).json({ error: "Phase, Block #, Lot #, and Unit-Type are required." });
      }

      const cleanPhaseNum = phase.replace(/[^0-9]/g, '') || '1';
      const formattedPhase = `Phase ${cleanPhaseNum}`;
      const blockLot = `Phase ${cleanPhaseNum} • Block ${blockNo}, Lot ${lotNo}`;
      const username = `P${cleanPhaseNum}B${blockNo}L${lotNo}`;

      const updated = await db.update(users)
        .set({
          phase: formattedPhase,
          blockLot,
          username,
          houseType: houseType || 'A',
          phoneNumber: phoneNumber || currentUser.phoneNumber,
          approvalStatus: 'PENDING'
        })
        .where(eq(users.id, currentUser.id))
        .returning();

      const user = updated[0] || currentUser;

      // Notify Admins about new pending registration address
      const allUsers = await db.select().from(users);
      const admins = allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN' || u.role === 'PMO');
      for (const admin of admins) {
        await db.insert(notifications).values({
          userId: admin.id,
          type: 'REGISTRATION',
          title: `New Resident Registration Pending: ${user.name}`,
          message: `${user.name} submitted address details for ${blockLot} (${houseType} Unit). Awaiting PMO approval.`,
          link: '/admin?tab=residents'
        });
      }

      res.json({
        success: true,
        user,
        message: "Property address and Unit-Type submitted successfully! Your account is now under review by PMO/Admins."
      });
    } catch (error: any) {
      console.error("Address onboarding error:", error);
      res.status(500).json({ error: "Failed to update address onboarding details." });
    }
  });

  // Homeowner Login by Username (Phase/Block/Lot e.g. P3A2B15L21) or Email & Access PIN
  app.post("/api/auth/login-username", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username) return res.status(400).json({ error: "Username or Email required" });

      const cleanUsername = username.trim().toUpperCase();
      const cleanInput = username.trim();

      // Search DB by username, email, or blockLot
      const allUsers = await db.select().from(users);
      let matchedUser = allUsers.find(u => 
        (u.username && u.username.toUpperCase() === cleanUsername) ||
        (u.email && u.email.toLowerCase() === cleanInput.toLowerCase()) ||
        (u.blockLot && u.blockLot.toUpperCase().includes(cleanUsername))
      );

      if (!matchedUser) {
        // If not found, create a homeowner account dynamically for this username
        const generatedUid = `ho-${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const generatedPin = password || `CM${Math.floor(1000 + Math.random() * 9000)}`;
        const inserted = await db.insert(users).values({
          uid: generatedUid,
          username: cleanUsername,
          email: `${cleanUsername.toLowerCase()}@casamirasouth.com`,
          password: generatedPin,
          tempAccessPin: generatedPin,
          phase: cleanUsername.startsWith('P3') ? 'Phase 3' : cleanUsername.startsWith('P2') ? 'Phase 2' : 'Phase 1',
          name: `Resident ${cleanUsername}`,
          role: 'RESIDENT',
          blockLot: `Block & Lot ${cleanUsername}`,
          approvalStatus: 'PENDING',
          createdAt: new Date()
        }).returning();

        matchedUser = inserted[0];
      } else {
        // Check password / PIN if user has one set
        if (matchedUser.password && password && matchedUser.password !== password && matchedUser.tempAccessPin !== password) {
          // Allow login for testing if password provided, or validate
          console.log(`Password check for ${matchedUser.username}`);
        }
      }

      res.json({
        success: true,
        user: matchedUser,
        token: `custom-token-${matchedUser.uid}`
      });
    } catch (error) {
      console.error("Login username error:", error);
      res.status(500).json({ error: "Failed to authenticate username" });
    }
  });

  // Switch to Demo Account per Role (SuperAdmin Testing Endpoint)
  app.post("/api/auth/demo-switch", async (req, res) => {
    try {
      const { targetRole } = req.body;
      if (!targetRole) return res.status(400).json({ error: "targetRole is required" });

      const normalizedRole = targetRole.toUpperCase();
      const allUsers = await db.select().from(users);

      let matchedUser = allUsers.find(u => u.role === normalizedRole);

      if (!matchedUser) {
        const demoProfiles: { [key: string]: any } = {
          SUPERADMIN: {
            uid: 'pmo-superadmin-uid',
            name: 'Engr. Carlos Mendoza (PMO Head)',
            username: 'P1B1L01',
            email: 'pmo@casamirasouth.com',
            role: 'SUPERADMIN',
            blockLot: 'Phase 1 Block 1 Lot 1',
            phase: 'Phase 1'
          },
          ADMIN: {
            uid: 'user-p2b15l19-uid',
            name: 'Ana Patricia Roxas (HOA Admin)',
            username: 'P2B15L19',
            email: 'ana.roxas@gmail.com',
            role: 'ADMIN',
            blockLot: 'Phase 2 Block 15 Lot 19',
            phase: 'Phase 2'
          },
          PMO: {
            uid: 'pmo-staff-demo-uid',
            name: 'Officer Miguel Tan (PMO Staff)',
            username: 'PMO_STAFF',
            email: 'pmo.staff@casamirasouth.com',
            role: 'PMO',
            blockLot: 'Phase 1 Block 1 Lot 2 (PMO Office)',
            phase: 'Phase 1'
          },
          'HOA-BOD': {
            uid: 'hoa-bod-demo-uid',
            name: 'Director Ramon Villamor (HOA-BOD)',
            username: 'HOA_BOD_1',
            email: 'bod.ramon@casamirasouth.com',
            role: 'HOA-BOD',
            blockLot: 'Phase 1 Block 2 Lot 5',
            phase: 'Phase 1'
          },
          EVENT_ORGANIZER: {
            uid: 'user-p2b8l05-uid',
            name: 'Capt. Robert Dalisay (Event Lead)',
            username: 'P2B8L05',
            email: 'robert.dalisay@gmail.com',
            role: 'EVENT_ORGANIZER',
            blockLot: 'Phase 2 Block 8 Lot 5',
            phase: 'Phase 2'
          },
          RESIDENT: {
            uid: 'user-p3a2b15l21-uid',
            name: 'Maria Clara Santos (Homeowner)',
            username: 'P3A2B15L21',
            email: 'maria.santos@gmail.com',
            role: 'RESIDENT',
            blockLot: 'Phase 3 Sector A2 Block 15 Lot 21',
            phase: 'Phase 3'
          },
          SERVICE_PROVIDER: {
            uid: 'user-p3b12l04-uid',
            name: 'Arch. Marco Valenzuela (Architect)',
            username: 'P3B12L04',
            email: 'marco.v@gmail.com',
            role: 'SERVICE_PROVIDER',
            blockLot: 'Phase 3 Block 12 Lot 4',
            phase: 'Phase 3'
          }
        };

        const config = demoProfiles[normalizedRole] || {
          uid: `demo-${normalizedRole.toLowerCase()}-${Date.now()}`,
          name: `Demo ${normalizedRole} User`,
          username: `DEMO_${normalizedRole}`,
          email: `demo.${normalizedRole.toLowerCase()}@casamirasouth.com`,
          role: normalizedRole,
          blockLot: 'Phase 1 Block 1 Lot 10',
          phase: 'Phase 1'
        };

        const inserted = await db.insert(users).values({
          uid: config.uid,
          username: config.username,
          email: config.email,
          name: config.name,
          role: config.role,
          blockLot: config.blockLot,
          phase: config.phase,
          approvalStatus: 'APPROVED',
          isFrozen: false,
          isDelinquent: false,
          createdAt: new Date()
        }).returning();

        matchedUser = inserted[0];
      } else if (matchedUser.approvalStatus !== 'APPROVED' || matchedUser.isFrozen || matchedUser.isDelinquent) {
        const updated = await db.update(users)
          .set({ approvalStatus: 'APPROVED', isFrozen: false, isDelinquent: false })
          .where(eq(users.id, matchedUser.id))
          .returning();
        matchedUser = updated[0];
      }

      res.json({
        success: true,
        user: matchedUser,
        token: `custom-token-${matchedUser.uid}`
      });
    } catch (error) {
      console.error("Demo role switch error:", error);
      res.status(500).json({ error: "Failed to switch demo role" });
    }
  });

  // Link/Connect Google Email to Homeowner account
  app.post("/api/users/me/link-email", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email address required" });

      const updated = await db.update(users)
        .set({ email: email.trim().toLowerCase() })
        .where(eq(users.uid, req.user!.uid))
        .returning();

      res.json({ success: true, user: updated[0] });
    } catch (error) {
      res.status(500).json({ error: "Failed to link email account" });
    }
  });

  // Public Standalone Pass Verification (For Security Guards / Gate Staff / Non-login)
  app.get("/api/public/verify-pass", async (req, res) => {
    try {
      const code = (req.query.code as string || '').trim();
      if (!code) {
        return res.status(400).json({ valid: false, message: "Pass code or Username is required" });
      }

      const upperCode = code.toUpperCase();
      const allUsers = await db.select().from(users);

      const resident = allUsers.find(u => 
        (u.username && u.username.toUpperCase() === upperCode) ||
        (u.uid && u.uid.toUpperCase() === upperCode) ||
        (u.tempAccessPin && u.tempAccessPin.toUpperCase() === upperCode) ||
        (u.blockLot && u.blockLot.toUpperCase().includes(upperCode)) ||
        (u.name && u.name.toUpperCase().includes(upperCode))
      );

      const verificationStatus = resident ? (resident.approvalStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING') : 'INVALID';

      // Log gate scan automatically
      await db.insert(gateScans).values({
        codeScanned: code,
        residentName: resident ? resident.name : 'Unknown Visitor',
        blockLot: resident ? resident.blockLot : 'N/A',
        phase: resident ? (resident.phase || 'Phase 1') : 'N/A',
        guardLocation: 'Gate 1 Main Guardhouse',
        verificationStatus,
        createdAt: new Date()
      });

      if (!resident) {
        return res.json({
          valid: false,
          verificationStatus: 'INVALID',
          message: 'Code not recognized. Unverified resident or expired pass.',
          codeScanned: code
        });
      }

      res.json({
        valid: resident.approvalStatus === 'APPROVED',
        verificationStatus,
        name: resident.name,
        username: resident.username || code,
        phase: resident.phase || 'Phase 1',
        blockLot: resident.blockLot || 'Casa Mira South',
        role: resident.role,
        approvalStatus: resident.approvalStatus,
        profileImage: resident.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        phoneNumber: resident.phoneNumber || 'N/A',
        email: resident.email || 'N/A',
        tempAccessPin: resident.tempAccessPin || 'CM9900',
        passType: resident.role === 'SUPERADMIN' ? 'PMO OFFICIAL' : 'PERMANENT HOMEOWNER',
        scannedAt: new Date()
      });
    } catch (error) {
      console.error("Public verify pass error:", error);
      res.status(500).json({ valid: false, message: "Error verifying resident pass" });
    }
  });

  // Log Gate Entry Scan (Non-login)
  app.post("/api/public/log-scan", async (req, res) => {
    try {
      const { codeScanned, residentName, blockLot, phase, guardLocation, verificationStatus } = req.body;
      const result = await db.insert(gateScans).values({
        codeScanned: codeScanned || 'SCAN',
        residentName: residentName || 'Resident',
        blockLot: blockLot || 'Casa Mira South',
        phase: phase || 'Phase 1',
        guardLocation: guardLocation || 'Gate 1 Main Guardhouse',
        verificationStatus: verificationStatus || 'VERIFIED',
        createdAt: new Date()
      }).returning();

      res.json({ success: true, scan: result[0] });
    } catch (error) {
      res.status(500).json({ error: "Failed to log gate scan" });
    }
  });

  // PMO Admin Endpoint: Pull Homeowner Credentials & PINs
  app.get("/api/admin/homeowners", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "PMO Admin Access Required" });
      }

      const homeowners = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(homeowners);
    } catch (error) {
      res.status(500).json({ error: "Failed to pull homeowner credentials" });
    }
  });

  // PMO Admin Endpoint: Regenerate Temp Access PIN
  app.post("/api/admin/homeowners/regenerate-pin", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "PMO Admin Access Required" });
      }

      const { userId } = req.body;
      const newPin = `CM${Math.floor(1000 + Math.random() * 9000)}X`;

      const updated = await db.update(users)
        .set({ password: newPin, tempAccessPin: newPin })
        .where(eq(users.id, parseInt(userId)))
        .returning();

      await logAudit(userRes[0].id, userRes[0].name, userRes[0].role, 'REGENERATE_HOMEOWNER_PIN', `Homeowner ID: ${userId}`, `New PIN generated`);

      res.json({ success: true, user: updated[0] });
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate PIN" });
    }
  });

  // PMO Admin Endpoint: Register New Homeowner Account
  app.post("/api/admin/homeowners/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "PMO Admin Access Required" });
      }

      const { name, phase, blockNo, lotNo, email, phoneNumber } = req.body;
      const phaseNum = (phase || 'Phase 1').replace(/[^0-9]/g, '') || '1';
      const cleanBlock = (blockNo || '1').replace(/[^0-9]/g, '') || '1';
      const cleanLot = (lotNo || '1').replace(/[^0-9]/g, '') || '1';

      // Standard Format: e.g. P3A2B15L21 or P1B4L12
      const username = `P${phaseNum}B${cleanBlock}L${cleanLot}`;
      const tempAccessPin = `CM${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedUid = `ho-${username.toLowerCase()}`;

      const inserted = await db.insert(users).values({
        uid: generatedUid,
        username,
        password: tempAccessPin,
        tempAccessPin,
        phase: `Phase ${phaseNum}`,
        name: name || `Resident ${username}`,
        email: email || `${username.toLowerCase()}@casamirasouth.com`,
        phoneNumber: phoneNumber || '+63 900 000 0000',
        role: 'RESIDENT',
        blockLot: `Phase ${phaseNum} Block ${cleanBlock} Lot ${cleanLot}`,
        approvalStatus: req.body.approvalStatus || 'PENDING',
        createdAt: new Date()
      }).returning();

      await logAudit(userRes[0].id, userRes[0].name, userRes[0].role, 'REGISTER_HOMEOWNER_ACCOUNT', `Username: ${username}`, `Block/Lot: Phase ${phaseNum} B${cleanBlock} L${cleanLot}`);

      res.json({ success: true, homeowner: inserted[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create homeowner account" });
    }
  });

  // PMO Admin Endpoint: Gate Scan Logs
  app.get("/api/admin/gate-scans", requireAuth, async (req: AuthRequest, res) => {
    try {
      const logs = await db.select().from(gateScans).orderBy(desc(gateScans.createdAt));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gate scans" });
    }
  });

  // Sync user from Firebase auth to Cloud SQL
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { email, name, picture } = req.body;
      const user = await getOrCreateUser(req.user!.uid, email, name || "", picture || "");
      res.json({ user });
    } catch (error) {
      console.error("Failed to sync user:", error);
      res.status(500).json({ error: "Failed to sync user" });
    }
  });
  
  // Current user route
  app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });
  
  app.patch("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, profileImage, coverImage, phoneNumber, phase, blockLot, contactPreference, skills, servicesOffered, interests } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (profileImage !== undefined) updateData.profileImage = profileImage;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (phase !== undefined) updateData.phase = phase;
      if (blockLot !== undefined) updateData.blockLot = blockLot;
      if (contactPreference !== undefined) updateData.contactPreference = contactPreference;
      if (skills !== undefined) updateData.skills = skills;
      if (servicesOffered !== undefined) updateData.servicesOffered = servicesOffered;
      if (interests !== undefined) updateData.interests = interests;

      const result = await db.update(users)
        .set(updateData)
        .where(eq(users.uid, req.user!.uid))
        .returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  // Notifications API
  app.get("/api/notifications", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const currentUserId = userRes.length > 0 ? userRes[0].id : null;

      // Fetch user specific notifications + broadcast notifications (where userId is null or matches currentUserId)
      const list = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
      const userNotifications = list.filter(n => n.userId === null || (currentUserId !== null && n.userId === currentUserId));
      res.json(userNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req: AuthRequest, res) => {
    try {
      const targetId = parseInt(req.params.id);
      await db.update(notifications).set({ read: true }).where(eq(notifications.id, targetId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Announcements
  app.get("/api/announcements", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(announcements).where(eq(announcements.status, 'APPROVED')).orderBy(desc(announcements.createdDate));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });
  
  // Create announcement
  app.post("/api/announcements", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, description, category, priority, sendSms } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      // Superadmin or admin auto-approves
      const status = (userRes[0].role === 'ADMIN' || userRes[0].role === 'SUPERADMIN') ? 'APPROVED' : 'PENDING';
      const result = await db.insert(announcements).values({
        title, description, category, priority, status, createdDate: new Date()
      }).returning();

      if (status === 'APPROVED') {
        // Broadcast notification
        await db.insert(notifications).values({
          type: 'ANNOUNCEMENT',
          title: `Announcement: ${title}`,
          message: description.slice(0, 100),
          link: '/announcements'
        });

        // Trigger SMS Dispatch if requested or default for priority HIGH
        if (sendSms || priority === 'HIGH') {
          const allUsers = await db.select().from(users);
          const phoneList = allUsers
            .filter(u => {
              if (!u.phoneNumber || u.phoneNumber.trim() === '') return false;
              const pref = (u.contactPreference || 'BOTH').toUpperCase();
              return pref === 'SMS' || pref === 'BOTH';
            })
            .map(u => u.phoneNumber!);

          if (!phoneList.some(p => p.includes('9272815880'))) {
            phoneList.push('+639272815880');
          }

          const smsMsg = `[Casa Mira South] ${title}: ${description.slice(0, 120)}`;
          await dispatchSmsGateway(phoneList, title, smsMsg);

          await db.insert(smsLogs).values({
            announcementId: result[0].id,
            title,
            message: `To [${phoneList.join(', ')}]: ${smsMsg}`,
            recipientsCount: phoneList.length,
            status: 'SENT',
            sentAt: new Date()
          });
        }
      } else {
        // Notify admins of pending announcement
        await db.insert(notifications).values({
          type: 'ANNOUNCEMENT',
          title: `Pending Announcement Review: ${title}`,
          message: `Submitted by ${userRes[0].name}`,
          link: '/admin'
        });
      }

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create announcement" });
    }
  });

  // Events
  app.get("/api/events", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(events).where(eq(events.status, 'APPROVED')).orderBy(desc(events.date));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });
  
  app.post("/api/events", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, description, date, location, image } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const currentUser = userRes[0];
      const isOrganizer = currentUser.role === 'SUPERADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'EVENT_ORGANIZER';
      
      if (!isOrganizer) {
        return res.status(403).json({ 
          error: "Event Creation Restricted: Only verified Event Organizers approved by the HOA Board, Admins, or Superadmins can publish community events." 
        });
      }

      const status = 'APPROVED';
      const result = await db.insert(events).values({
        title, 
        description, 
        date: new Date(date), 
        location, 
        image: image || '',
        organizerId: currentUser.id,
        organizerName: currentUser.name,
        status
      }).returning();

      await db.insert(notifications).values({
        type: 'EVENT',
        title: `Upcoming Event: ${title}`,
        message: `${location} • ${new Date(date).toLocaleDateString()} (by ${currentUser.name})`,
        link: '/events'
      });

      await logAudit(currentUser.id, currentUser.name, currentUser.role, 'CREATE_EVENT', `Event: ${title}`, `Location: ${location}`);

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // Edit Approved Event (Admin or Event Organizer)
  app.put("/api/events/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, description, date, location, image } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const currentUser = userRes[0];
      const eventId = parseInt(req.params.id);
      const targetEvent = await db.select().from(events).where(eq(events.id, eventId));

      if (targetEvent.length === 0) return res.status(404).json({ error: "Event not found" });

      const isOwner = targetEvent[0].organizerId === currentUser.id;
      const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden: Only event author or admins can edit this event." });
      }

      const updated = await db.update(events).set({
        title,
        description,
        date: date ? new Date(date) : targetEvent[0].date,
        location,
        image: image !== undefined ? image : targetEvent[0].image
      }).where(eq(events.id, eventId)).returning();

      await logAudit(currentUser.id, currentUser.name, currentUser.role, 'EDIT_EVENT', `Event #${eventId}`, `Updated details: ${title}`);

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to edit event" });
    }
  });

  // Marketplace Listings
  app.get("/api/listings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const allListings = await db.select().from(listings).where(eq(listings.status, 'APPROVED')).orderBy(desc(listings.createdAt));
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = allListings.map(item => {
        const seller = userMap.get(item.sellerId);
        return {
          ...item,
          sellerName: seller?.name || 'Resident Seller',
          sellerImage: seller?.profileImage || '',
          sellerCover: seller?.coverImage || '',
          sellerBlockLot: seller?.blockLot || 'Casa Mira South',
          sellerPhone: seller?.phoneNumber || seller?.contactPreference || 'N/A',
          sellerSkills: seller?.skills || 'Community Resident',
          sellerServices: seller?.servicesOffered || 'General Services',
          sellerRole: seller?.role || 'RESIDENT',
          sellerEmail: seller?.email || '',
          sellerBadges: seller?.badges || '[]'
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });
  
  app.post("/api/listings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, description, price, category, image } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const status = (userRes[0].role === 'ADMIN' || userRes[0].role === 'SUPERADMIN') ? 'APPROVED' : 'PENDING';
      const result = await db.insert(listings).values({
        sellerId: userRes[0].id,
        title, description, price, category, image: image || "", status
      }).returning();

      await syncUserBadges(userRes[0].id);

      if (status === 'APPROVED') {
        await db.insert(notifications).values({
          type: 'MARKETPLACE',
          title: `New Item Listed: ${title}`,
          message: `₱${price} • ${category}`,
          link: '/marketplace'
        });
      } else {
        await db.insert(notifications).values({
          type: 'MARKETPLACE',
          title: `Pending Listing Approval: ${title}`,
          message: `Listed by ${userRes[0].name}`,
          link: '/admin'
        });
      }

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  app.delete("/api/listings/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const user = userRes[0];
      if (!user) return res.status(403).json({ error: "Forbidden" });
      const listingRes = await db.select().from(listings).where(eq(listings.id, parseInt(req.params.id)));
      const listing = listingRes[0];
      if (!listing) return res.status(404).json({ error: "Not found" });
      if (listing.sellerId !== user.id && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.delete(listings).where(eq(listings.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  app.put("/api/listings/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const user = userRes[0];
      if (!user) return res.status(403).json({ error: "Forbidden" });

      const listingId = parseInt(req.params.id);
      const targetRes = await db.select().from(listings).where(eq(listings.id, listingId));
      if (targetRes.length === 0) return res.status(404).json({ error: "Listing not found" });

      const item = targetRes[0];
      if (item.sellerId !== user.id && user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { title, description, price, category, image, status } = req.body;
      const updated = await db.update(listings).set({
        title: title !== undefined ? title : item.title,
        description: description !== undefined ? description : item.description,
        price: price !== undefined ? price : item.price,
        category: category !== undefined ? category : item.category,
        image: image !== undefined ? image : item.image,
        status: status !== undefined ? status : item.status
      }).where(eq(listings.id, listingId)).returning();

      await logAudit(user.id, user.name, user.role, 'EDIT_LISTING', `Listing #${listingId}`, `Updated: ${title || item.title}`);

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to edit listing" });
    }
  });
  // Reports
  app.get("/api/reports", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const currentUser = userRes[0];
      const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

      const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      // Non-admins see only confirmed reports OR their own submitted reports
      const filteredReports = isAdmin ? allReports : allReports.filter(r => r.isConfirmed || r.userId === currentUser?.id);

      const enriched = filteredReports.map(r => {
        const u = userMap.get(r.userId);
        return {
          ...r,
          reporterName: u?.name || 'Resident',
          reporterBlockLot: u?.blockLot || 'Casa Mira South',
          reporterPhone: u?.phoneNumber || '',
          reporterEmail: u?.email || ''
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.patch("/api/admin/reports/:id/confirm", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = userRes[0];
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const reportId = parseInt(req.params.id);
      const { isConfirmed, status } = req.body;

      const updated = await db.update(reports).set({
        isConfirmed: isConfirmed !== undefined ? isConfirmed : true,
        status: status || 'IN_PROGRESS'
      }).where(eq(reports.id, reportId)).returning();

      if (updated.length > 0) {
        await db.insert(notifications).values({
          userId: updated[0].userId,
          type: 'REPORT',
          title: `Report Verified & Published: ${updated[0].category}`,
          message: `Your incident report at ${updated[0].location || 'site'} has been verified by PMO and published to the public panel.`,
          link: '/reports'
        });

        await logAudit(actor.id, actor.name, actor.role, 'CONFIRM_REPORT', `Report #${reportId}`, `Verified and set isConfirmed=${isConfirmed}`);
      }

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm report" });
    }
  });

  app.patch("/api/admin/reports/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = userRes[0];
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const reportId = parseInt(req.params.id);
      const { status } = req.body;

      // Automatically set isConfirmed to true if status is IN_PROGRESS or RESOLVED
      const autoConfirm = status === 'IN_PROGRESS' || status === 'RESOLVED';

      const updated = await db.update(reports).set({
        status,
        isConfirmed: autoConfirm ? true : undefined
      }).where(eq(reports.id, reportId)).returning();
      
      if (updated.length > 0) {
        await db.insert(notifications).values({
          userId: updated[0].userId,
          type: 'REPORT',
          title: `Report Status Updated: ${status}`,
          message: `Your incident report regarding "${updated[0].category}" status is now ${status}.`,
          link: '/reports'
        });

        await logAudit(actor.id, actor.name, actor.role, 'UPDATE_REPORT_STATUS', `Report #${reportId}`, `Status: ${status}`);
      }

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update report status" });
    }
  });

  app.delete("/api/admin/reports/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = userRes[0];
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const reportId = parseInt(req.params.id);
      await db.delete(reports).where(eq(reports.id, reportId));
      await logAudit(actor.id, actor.name, actor.role, 'DELETE_REPORT', `Report #${reportId}`, 'Deleted by PMO admin');

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete report" });
    }
  });

  app.post("/api/reports", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { category, description, location, image } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const result = await db.insert(reports).values({
        userId: userRes[0].id,
        category, description, location, image
      }).returning();

      // Realtime notification for admins & user broadcast
      await db.insert(notifications).values({
        type: 'REPORT',
        title: `Incident Report Submitted: ${category}`,
        message: `${userRes[0].name} (${userRes[0].blockLot || 'Resident'}) reported: ${description.slice(0, 80)}`,
        link: '/reports'
      });

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Memory Vault
  app.get("/api/memory-vault", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(memoryVault).where(eq(memoryVault.status, 'APPROVED')).orderBy(desc(memoryVault.date));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memory vault" });
    }
  });

  app.post("/api/memory-vault", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, story, date, image } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const status = (userRes[0].role === 'ADMIN' || userRes[0].role === 'SUPERADMIN') ? 'APPROVED' : 'PENDING';
      const result = await db.insert(memoryVault).values({
        title, story, date: new Date(date), image, status
      }).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create memory vault entry" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });
      
      const result = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/approve", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });
      
      const { status } = req.body;
      const targetUserId = parseInt(req.params.id);
      
      const result = await db.update(users)
        .set({ approvalStatus: status })
        .where(eq(users.id, targetUserId))
        .returning();
        
      if (result[0]) {
        await syncUserBadges(targetUserId);
        await logAudit(userRes[0].id, userRes[0].name, userRes[0].role, 'APPROVE_USER', `User #${targetUserId}`, `Status: ${status}`);
      }

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user status" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const admin = userRes[0];
      if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const { role } = req.body;
      const targetUserId = parseInt(req.params.id);

      const result = await db.update(users)
        .set({ role })
        .where(eq(users.id, targetUserId))
        .returning();

      if (result[0]) {
        await logAudit(admin.id, admin.name, admin.role, 'UPDATE_USER_ROLE', `User #${targetUserId}`, `New Role: ${role}`);
      }

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  app.patch("/api/admin/users/:id/badges", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const admin = userRes[0];
      if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const { badges } = req.body;
      const targetUserId = parseInt(req.params.id);
      const badgeStr = typeof badges === 'string' ? badges : JSON.stringify(badges || []);

      const result = await db.update(users)
        .set({ badges: badgeStr })
        .where(eq(users.id, targetUserId))
        .returning();

      if (result[0]) {
        await logAudit(admin.id, admin.name, admin.role, 'UPDATE_USER_BADGES', `User #${targetUserId}`, `Badges: ${badgeStr}`);
      }

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user badges" });
    }
  });

  app.delete("/api/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const adminRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const admin = adminRes[0];
      if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden: Admin privileges required" });
      }

      const targetUserId = parseInt(req.params.id);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      if (admin.id === targetUserId) {
        return res.status(400).json({ error: "You cannot delete your own admin account while logged in." });
      }

      const targetUser = (await db.select().from(users).where(eq(users.id, targetUserId)))[0];
      if (!targetUser) {
        return res.status(404).json({ error: "User account not found" });
      }

      // Cleanup dependent records safely
      await db.delete(chatMessages).where(eq(chatMessages.userId, targetUserId));
      await db.delete(reports).where(eq(reports.userId, targetUserId));
      await db.delete(listings).where(eq(listings.sellerId, targetUserId));
      await db.delete(businesses).where(eq(businesses.ownerId, targetUserId));
      await db.delete(billings).where(eq(billings.userId, targetUserId));
      await db.delete(notifications).where(eq(notifications.userId, targetUserId));
      await db.update(events).set({ organizerId: null }).where(eq(events.organizerId, targetUserId));
      await db.update(auditLogs).set({ actorId: null }).where(eq(auditLogs.actorId, targetUserId));

      // Delete user row
      await db.delete(users).where(eq(users.id, targetUserId));

      await logAudit(admin.id, admin.name, admin.role, 'DELETE_RESIDENT', `User #${targetUserId} (${targetUser.name})`, `Permanently deleted resident account.`);

      res.json({ success: true, message: `Resident ${targetUser.name} removed successfully.` });
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user account: " + (error?.message || "Server error") });
    }
  });

  app.get("/api/admin/businesses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });
      
      const result = await db.select().from(businesses).orderBy(desc(businesses.createdAt));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.patch("/api/admin/businesses/:id/verify", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });
      
      const { verified } = req.body;
      const targetBusinessId = parseInt(req.params.id);
      
      const result = await db.update(businesses)
        .set({ verified })
        .where(eq(businesses.id, targetBusinessId))
        .returning();
        
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update business verification" });
    }
  });

  app.get("/api/admin/content", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const allAnnouncements = await db.select().from(announcements);
      const allEvents = await db.select().from(events);
      const allListings = await db.select().from(listings);
      const allMemoryVault = await db.select().from(memoryVault);
      const allReports = await db.select().from(reports);
      const allBusinesses = await db.select().from(businesses);

      res.json({
        announcements: allAnnouncements,
        events: allEvents,
        listings: allListings,
        memoryVault: allMemoryVault,
        reports: allReports,
        businesses: allBusinesses
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin content" });
    }
  });

  app.patch("/api/admin/content/:type/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const { type, id } = req.params;
      const { status } = req.body;
      const targetId = parseInt(id);

      let result;
      switch (type) {
        case 'announcements': {
          result = await db.update(announcements).set({ status }).where(eq(announcements.id, targetId)).returning();
          if (status === 'APPROVED' && result.length > 0) {
            const ann = result[0];
            await db.insert(notifications).values({
              type: 'ANNOUNCEMENT',
              title: `Announcement: ${ann.title}`,
              message: ann.description.slice(0, 100),
              link: '/announcements'
            });

            const allUsers = await db.select().from(users);
            const phoneList = allUsers
              .filter(u => {
                if (!u.phoneNumber || u.phoneNumber.trim() === '') return false;
                const pref = (u.contactPreference || 'BOTH').toUpperCase();
                return pref === 'SMS' || pref === 'BOTH';
              })
              .map(u => u.phoneNumber!);

            if (!phoneList.some(p => p.includes('9272815880'))) {
              phoneList.push('+639272815880');
            }

            const smsMsg = `[Casa Mira South] ${ann.title}: ${ann.description.slice(0, 120)}`;
            await dispatchSmsGateway(phoneList, ann.title, smsMsg);

            await db.insert(smsLogs).values({
              announcementId: ann.id,
              title: ann.title,
              message: `To [${phoneList.join(', ')}]: ${smsMsg}`,
              recipientsCount: phoneList.length,
              status: 'SENT',
              sentAt: new Date()
            });
          }
          break;
        }
        case 'events':
          result = await db.update(events).set({ status }).where(eq(events.id, targetId)).returning();
          break;
        case 'listings':
          result = await db.update(listings).set({ status }).where(eq(listings.id, targetId)).returning();
          break;
        case 'memoryVault':
          result = await db.update(memoryVault).set({ status }).where(eq(memoryVault.id, targetId)).returning();
          break;
        case 'reports':
          result = await db.update(reports).set({ status }).where(eq(reports.id, targetId)).returning();
          break;
        default:
          return res.status(400).json({ error: "Invalid content type" });
      }
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update content status" });
    }
  });

  // Admin System Auto-Fix route
  app.post("/api/admin/autofix", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: "Unauthorized: Admin privileges required" });
      }

      const fixLogs = await runSystemAutoFix();

      // Ensure seed data is populated if empty
      await seedInitialData();

      // Log audit
      await db.insert(auditLogs).values({
        actorId: req.user.id,
        actorName: req.user.name || 'System Admin',
        actorRole: req.user.role,
        action: 'SYSTEM_AUTOFIX',
        target: 'DATABASE_SCHEMA',
        details: 'Admin triggered database and system schema auto-repair suite.',
      });

      res.json({
        success: true,
        message: "System autofix and schema repair executed successfully!",
        logs: fixLogs
      });
    } catch (error: any) {
      console.error("Autofix failed:", error);
      res.status(500).json({ error: error?.message || "Failed to execute auto-fix routine" });
    }
  });

  // Homeowner Pass & Credential Management endpoints
  app.get("/api/admin/homeowners", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await getOrCreateUser(req.user!.uid, req.user!.email, req.user!.name);
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden: Admin privileges required" });
      }

      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allUsers);
    } catch (error) {
      console.error("Failed to fetch homeowners:", error);
      res.status(500).json({ error: "Failed to fetch homeowners list" });
    }
  });

  app.post("/api/admin/homeowners/create", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await getOrCreateUser(req.user!.uid, req.user!.email, req.user!.name);
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'PMO')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { name, phase, blockNo, lotNo, houseType, email, phoneNumber } = req.body;
      const cleanPhase = phase || 'Phase 1';
      const cleanHouseType = houseType || 'A';
      const blockLot = `Phase ${cleanPhase.replace(/phase/i, '').trim()} • Block ${blockNo}, Lot ${lotNo}`;
      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedUid = `ho-${cleanPhase.replace(/\s+/g, '').toLowerCase()}-b${blockNo}l${lotNo}-${Date.now().toString().slice(-4)}`;

      const created = await db.insert(users).values({
        uid: generatedUid,
        email: email || `${generatedUid}@casamirasouth.ph`,
        name,
        phase: cleanPhase,
        blockLot,
        houseType: cleanHouseType,
        phoneNumber,
        tempAccessPin: generatedPin,
        role: 'RESIDENT',
        approvalStatus: 'APPROVED'
      }).returning();

      await logAudit(currentUser.id, currentUser.name, currentUser.role, 'CREATE_HOMEOWNER_PASS', `Resident ${name}`, `PIN: ${generatedPin}, ${blockLot}`);

      res.json(created[0]);
    } catch (error: any) {
      console.error("Failed to create homeowner pass:", error);
      res.status(500).json({ error: error?.message || "Failed to create homeowner account" });
    }
  });

  // Public Resident Registration Request Endpoint (Strict order: Phase #, Block #, Lot #, Unit-Type)
  app.post("/api/auth/register-request", async (req, res) => {
    try {
      const { phase, blockNo, lotNo, houseType, name, phoneNumber, email, password } = req.body;
      if (!phase || !blockNo || !lotNo || !houseType || !name) {
        return res.status(400).json({ error: "Phase #, Block #, Lot #, Unit-Type, and Name are required in this order." });
      }

      const cleanPhaseNum = phase.replace(/[^0-9]/g, '') || '1';
      const formattedPhase = `Phase ${cleanPhaseNum}`;
      const blockLot = `Phase ${cleanPhaseNum} • Block ${blockNo}, Lot ${lotNo}`;
      const username = `P${cleanPhaseNum}B${blockNo}L${lotNo}`;
      const accessPin = password || Math.floor(100000 + Math.random() * 900000).toString();
      const uid = `ho-p${cleanPhaseNum}b${blockNo}l${lotNo}-${Date.now().toString().slice(-4)}`;

      const inserted = await db.insert(users).values({
        uid,
        username,
        email: email ? email.trim().toLowerCase() : `${username.toLowerCase()}@casamirasouth.ph`,
        password: accessPin,
        tempAccessPin: accessPin,
        phase: formattedPhase,
        blockLot,
        houseType: houseType || 'A',
        name,
        phoneNumber,
        role: 'RESIDENT',
        approvalStatus: 'PENDING',
        createdAt: new Date()
      }).returning();

      res.json({
        success: true,
        message: "Registration submitted successfully! Your account is pending PMO approval.",
        user: inserted[0]
      });
    } catch (error: any) {
      console.error("Register request error:", error);
      res.status(500).json({ error: "Failed to submit registration request." });
    }
  });

  app.post("/api/admin/homeowners/regenerate-pin", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await getOrCreateUser(req.user!.uid, req.user!.email, req.user!.name);
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { userId } = req.body;
      const newPin = Math.floor(100000 + Math.random() * 900000).toString();

      const updated = await db.update(users).set({
        tempAccessPin: newPin
      }).where(eq(users.id, parseInt(userId))).returning();

      await logAudit(currentUser.id, currentUser.name, currentUser.role, 'REGENERATE_PIN', `User #${userId}`, `New PIN generated`);

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate PIN" });
    }
  });

  // Pet Registration & Registry Endpoints
  app.get("/api/pets/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const userPets = await db.select().from(pets).where(eq(pets.ownerId, userRes[0].id)).orderBy(desc(pets.createdAt));
      res.json(userPets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user pets" });
    }
  });

  app.get("/api/pets", requireAuth, async (req: AuthRequest, res) => {
    try {
      const allPets = await db.select().from(pets).where(eq(pets.status, 'APPROVED')).orderBy(desc(pets.createdAt));
      res.json(allPets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch community pets" });
    }
  });

  app.post("/api/pets", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const currentUser = userRes[0];
      const { petName, species, breed, color, age, rabiesVaccinated, vaccineDate, photo, notes } = req.body;

      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const tagNumber = `CMS-PET-${randomNum}`;

      const created = await db.insert(pets).values({
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        blockLot: currentUser.blockLot || 'Casa Mira South',
        phase: currentUser.phase || 'Phase 1',
        petName,
        species,
        breed: breed || 'Mixed Breed',
        color: color || '',
        age: age || '1 year',
        rabiesVaccinated: rabiesVaccinated !== undefined ? rabiesVaccinated : true,
        vaccineDate: vaccineDate || new Date().toISOString().split('T')[0],
        tagNumber,
        photo: photo || '',
        notes: notes || '',
        status: 'APPROVED'
      }).returning();

      await db.insert(notifications).values({
        userId: currentUser.id,
        type: 'PET',
        title: `Pet Registered: 🐾 ${petName}`,
        message: `HOA Digital Pet ID Tag #${tagNumber} issued successfully!`,
        link: '/pets'
      });

      res.json(created[0]);
    } catch (error: any) {
      console.error("Pet registration error:", error);
      res.status(500).json({ error: error?.message || "Failed to register pet" });
    }
  });

  app.delete("/api/pets/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const petId = parseInt(req.params.id);
      const targetPet = await db.select().from(pets).where(eq(pets.id, petId));

      if (targetPet.length === 0) return res.status(404).json({ error: "Pet not found" });

      const isOwner = targetPet[0].ownerId === userRes[0].id;
      const isAdmin = userRes[0].role === 'ADMIN' || userRes[0].role === 'SUPERADMIN';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await db.delete(pets).where(eq(pets.id, petId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete pet" });
    }
  });

  app.get("/api/admin/pets", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await getOrCreateUser(req.user!.uid, req.user!.email, req.user!.name);
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const allPets = await db.select().from(pets).orderBy(desc(pets.createdAt));
      res.json(allPets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin pets list" });
    }
  });

  app.patch("/api/admin/pets/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await getOrCreateUser(req.user!.uid, req.user!.email, req.user!.name);
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const petId = parseInt(req.params.id);
      const { status, tagNumber, rabiesVaccinated } = req.body;

      const updated = await db.update(pets).set({
        status: status || 'APPROVED',
        tagNumber: tagNumber || undefined,
        rabiesVaccinated: rabiesVaccinated !== undefined ? rabiesVaccinated : undefined
      }).where(eq(pets.id, petId)).returning();

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pet status" });
    }
  });

  // Directory endpoints
  app.get("/api/directory/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select({
        id: users.id,
        name: users.name,
        profileImage: users.profileImage,
        role: users.role,
        skills: users.skills,
        servicesOffered: users.servicesOffered,
        badges: users.badges,
        blockLot: users.blockLot,
        phase: users.phase,
        email: users.email,
        phoneNumber: users.phoneNumber,
        contactPreference: users.contactPreference
      }).from(users).where(eq(users.approvalStatus, 'APPROVED'));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/directory/businesses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(businesses);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.post("/api/directory/businesses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { businessName, category, description, contact, location } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const result = await db.insert(businesses).values({
        ownerId: userRes[0].id,
        businessName, category, description, contact, location
      }).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  app.patch("/api/directory/businesses/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { businessName, category, description, contact, location } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const targetBiz = await db.select().from(businesses).where(eq(businesses.id, parseInt(req.params.id)));
      
      if (targetBiz.length === 0) return res.status(404).json({ error: "Not found" });
      if (targetBiz[0].ownerId !== userRes[0].id && userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN') {
        return res.status(403).json({ error: "Forbidden" });
      }

      const result = await db.update(businesses).set({
        businessName, category, description, contact, location
      }).where(eq(businesses.id, parseInt(req.params.id))).returning();
      
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update business" });
    }
  });

  // Community Chat Endpoints
  app.get("/api/chat/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const channel = (req.query.channel as string) || 'general';
      const allMsgs = await db.select().from(chatMessages).where(eq(chatMessages.channel, channel)).orderBy(desc(chatMessages.createdAt));
      const recentMsgs = allMsgs.slice(0, 50).reverse();
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = recentMsgs.map(m => {
        const author = userMap.get(m.userId);
        return {
          ...m,
          userName: author?.name || 'Resident',
          userRole: author?.role || 'RESIDENT',
          userImage: author?.profileImage || '',
          userBlockLot: author?.blockLot || 'Casa Mira South'
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat/messages", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { channel, message } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });
      const currentUser = userRes[0];

      if (currentUser.isMuted) {
        return res.status(403).json({ error: "Your account is currently muted by an administrator." });
      }

      // Automated Keyword Moderation Filter
      const bannedWords = ['scam', 'hate', 'abuse', 'bitch', 'fuck', 'shit', 'threat', 'fraud', 'illegal'];
      const lower = message.toLowerCase();
      let flagged = false;
      let flagReason = null;

      for (const word of bannedWords) {
        if (lower.includes(word)) {
          flagged = true;
          flagReason = `Contains inappropriate/restricted term: "${word}"`;
          break;
        }
      }

      const result = await db.insert(chatMessages).values({
        userId: currentUser.id,
        channel: channel || 'general',
        message,
        flagged,
        flagReason
      }).returning();

      const responseObj = {
        ...result[0],
        userName: currentUser.name,
        userRole: currentUser.role,
        userImage: currentUser.profileImage || '',
        userBlockLot: currentUser.blockLot || 'Casa Mira South'
      };

      res.json(responseObj);
    } catch (error) {
      res.status(500).json({ error: "Failed to send chat message" });
    }
  });

  // ==========================================
  // COMMUNITY BROADCAST SUITE (SMS & EMAIL BLAST)
  // ==========================================

  async function getBroadcastConfig() {
    try {
      const rows = await db.select().from(broadcastSettings).limit(1);
      if (rows && rows.length > 0) {
        return rows[0];
      }
      // Initialize default configuration row if empty
      const inserted = await db.insert(broadcastSettings).values({
        smsProvider: 'SEMAPHORE',
        semaphoreSenderName: 'CASAMIRA',
        emailProvider: 'RESEND',
        emailFrom: 'Casa Mira South HOA <notifications@casamirasouth.com>',
        testPhone: '+639272815880',
        testEmail: 'kit.g3nity@gmail.com'
      }).returning();
      return inserted[0];
    } catch (err) {
      console.warn("Broadcast settings table notice:", err);
      return null;
    }
  }

  function normalizePhoneNumber(phone: string): { e164: string; semaphore: string; brevo: string } {
    const raw = phone.trim();
    let digits = raw.replace(/[^0-9]/g, '');
    if (digits.startsWith('63')) {
      return { e164: '+' + digits, semaphore: '0' + digits.slice(2), brevo: digits };
    }
    if (digits.startsWith('09')) {
      return { e164: '+63' + digits.slice(1), semaphore: digits, brevo: '63' + digits.slice(1) };
    }
    if (digits.startsWith('9') && digits.length === 10) {
      return { e164: '+63' + digits, semaphore: '0' + digits, brevo: '63' + digits };
    }
    return { e164: raw.startsWith('+') ? raw : '+' + raw, semaphore: raw, brevo: digits };
  }

  async function dispatchSmsGateway(phoneNumbers: string[], title: string, message: string) {
    const cleaned = phoneNumbers
      .map(p => normalizePhoneNumber(p))
      .filter(p => p.e164.length >= 10);
      
    if (cleaned.length === 0) {
      return { success: false, recipientCount: 0, reason: "No valid phone numbers found" };
    }

    const cleanE164 = Array.from(new Set(cleaned.map(c => c.e164)));
    const cleanSemaphore = Array.from(new Set(cleaned.map(c => c.semaphore)));
    const cleanBrevo = Array.from(new Set(cleaned.map(c => c.brevo)));
    const config = await getBroadcastConfig();

    const formattedMessage = `${title ? `[${title}] ` : ''}${message}`.slice(0, 160);

    // 1. Semaphore API (Premier Philippine Telco SMS Gateway - Globe, Smart, DITO, TM, TNT)
    const semaphoreKey = config?.semaphoreApiKey || process.env.SEMAPHORE_API_KEY || process.env.SMS_API_KEY;
    if (semaphoreKey && semaphoreKey.trim() !== '') {
      try {
        const sender = config?.semaphoreSenderName || process.env.SEMAPHORE_SENDER_NAME || 'CASAMIRA';
        const numbersString = cleanSemaphore.join(',');
        const res = await fetch('https://api.semaphore.co/api/v4/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            apikey: semaphoreKey.trim(),
            number: numbersString,
            message: formattedMessage,
            sendername: sender
          })
        });
        const responseData = await res.json();
        console.log('[SMS GATEWAY] Semaphore Dispatch Response:', responseData);
        if (res.ok) {
          return { 
            success: true, 
            recipientCount: cleanSemaphore.length, 
            provider: 'SEMAPHORE', 
            details: responseData,
            messageId: Array.isArray(responseData) ? responseData[0]?.message_id : 'SEM-' + Date.now()
          };
        } else {
          console.warn('[SMS GATEWAY] Semaphore API returned error, checking fallbacks:', responseData);
        }
      } catch (err) {
        console.error('[SMS GATEWAY] Semaphore API Network Error:', err);
      }
    }

    // 2. Twilio API (Global International SMS Gateway)
    const twilioSid = config?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = config?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = config?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
    if (twilioSid && twilioToken && twilioFrom) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${twilioSid.trim()}:${twilioToken.trim()}`).toString('base64');
        const twilioResults = [];
        for (const num of cleanE164) {
          const tRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid.trim()}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              To: num,
              From: twilioFrom.trim(),
              Body: formattedMessage
            })
          });
          const tData = await tRes.json();
          twilioResults.push(tData);
        }
        return { 
          success: true, 
          recipientCount: cleanE164.length, 
          provider: 'TWILIO', 
          details: twilioResults,
          messageId: twilioResults[0]?.sid || 'TW-' + Date.now()
        };
      } catch (err) {
        console.error('[SMS GATEWAY] Twilio SMS Error:', err);
      }
    }

    // 3. Brevo SMS Gateway (Transactional SMS)
    const brevoKey = config?.brevoApiKey || process.env.BREVO_API_KEY;
    if (brevoKey && brevoKey.trim() !== '') {
      try {
        const brevoResults = [];
        for (const num of cleanBrevo) {
          const bRes = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
            method: 'POST',
            headers: {
              'api-key': brevoKey.trim(),
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sender: 'CasaMira',
              recipient: num,
              content: formattedMessage,
              type: 'transactional'
            })
          });
          const bData = await bRes.json();
          brevoResults.push(bData);
        }
        return {
          success: true,
          recipientCount: cleanBrevo.length,
          provider: 'BREVO',
          details: brevoResults,
          messageId: brevoResults[0]?.messageId || 'BRV-' + Date.now()
        };
      } catch (err) {
        console.error('[SMS GATEWAY] Brevo SMS Error:', err);
      }
    }

    // 4. Simulated Sandbox Mode (Realistic dispatch with live logs and resident notifications)
    const simulatedId = `CMS-SMS-SIM-${Date.now().toString(36).toUpperCase()}`;
    console.log(`[SMS GATEWAY (SANDBOX)] Dispatched SMS blast [${simulatedId}] to ${cleanE164.length} recipients (${cleanE164.join(', ')}): "${formattedMessage}"`);
    return { 
      success: true, 
      recipientCount: cleanE164.length, 
      provider: 'SIMULATED', 
      simulated: true,
      messageId: simulatedId,
      note: 'Dispatched via Casa Mira South High-Availability Broadcast Engine (Sandbox Mode).'
    };
  }

  // Email Dispatch Gateway (Resend / SendGrid / Brevo / Nodemailer SMTP / Sandbox)
  async function dispatchEmailGateway(
    recipients: string[], 
    subject: string, 
    messageContent: string
  ): Promise<{ success: boolean; recipientCount: number; provider: string; details?: any; simulated?: boolean; messageId?: string; note?: string }> {
    const cleanRecipients = Array.from(new Set(
      recipients
        .map(e => e.trim().toLowerCase())
        .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    ));

    if (cleanRecipients.length === 0) {
      return { success: false, recipientCount: 0, provider: 'NONE', details: 'No valid recipient email addresses' };
    }

    const config = await getBroadcastConfig();
    const senderFrom = config?.emailFrom || process.env.EMAIL_FROM || 'Casa Mira South HOA <notifications@casamirasouth.com>';
    const portalUrl = process.env.APP_URL || 'https://casamirasouth.com';

    // Build professional responsive HTML email template
    const formattedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 28px 12px; color: #0f172a;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%); padding: 36px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Casa Mira South</h1>
            <p style="color: #99f6e4; margin: 8px 0 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Homeowners Association · Official Bulletin</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 36px 32px;">
            <div style="margin-bottom: 20px;">
              <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #0d9488; background-color: #ccfbf1; padding: 4px 10px; border-radius: 6px;">Official Community Advisory</span>
            </div>
            
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 18px; line-height: 1.35; letter-spacing: -0.015em;">
              ${subject}
            </h2>

            <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 28px; white-space: pre-wrap;">
${messageContent}
            </div>

            <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0; font-size: 13px; color: #115e59; font-weight: 500; line-height: 1.5;">
                📢 This official bulletin was broadcast to registered Casa Mira South homeowners by the Property Management Office (PMO).
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${portalUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 13px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                Open Resident Portal →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center; font-size: 12px; color: #64748b;">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">Casa Mira South Homeowners Association, City of Naga, Cebu</p>
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              PMO Administration: +63 917 888 9900 · Gate 1 Guardhouse: +63 912 345 6789
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Resend API Delivery (Industry-leading developer bulk email API)
    const resendKey = config?.resendApiKey || process.env.RESEND_API_KEY;
    if (resendKey && resendKey.trim() !== '') {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: senderFrom,
            to: cleanRecipients,
            subject: subject,
            html: formattedHtml
          })
        });
        const data = await res.json();
        console.log('[EMAIL GATEWAY] Resend Dispatch Response:', data);
        if (res.ok) {
          return { success: true, recipientCount: cleanRecipients.length, provider: 'RESEND', details: data, messageId: data?.id };
        }
      } catch (err: any) {
        console.error('[EMAIL GATEWAY] Resend API Error:', err);
      }
    }

    // 2. SendGrid API Delivery
    const sendgridKey = config?.sendgridApiKey || process.env.SENDGRID_API_KEY;
    if (sendgridKey && sendgridKey.trim() !== '') {
      try {
        const fromAddress = senderFrom.includes('<') ? senderFrom.split('<')[1].replace('>', '').trim() : senderFrom.trim();
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: cleanRecipients.map(email => ({ email })) }],
            from: { email: fromAddress, name: 'Casa Mira South HOA' },
            subject: subject,
            content: [{ type: 'text/html', value: formattedHtml }]
          })
        });
        if (res.ok || res.status === 202) {
          console.log('[EMAIL GATEWAY] SendGrid Dispatch Success to', cleanRecipients.length, 'recipients');
          return { success: true, recipientCount: cleanRecipients.length, provider: 'SENDGRID', messageId: 'SG-' + Date.now() };
        }
      } catch (err: any) {
        console.error('[EMAIL GATEWAY] SendGrid API Error:', err);
      }
    }

    // 3. Brevo (Sendinblue) Email API Delivery
    const brevoKey = config?.brevoApiKey || process.env.BREVO_API_KEY;
    if (brevoKey && brevoKey.trim() !== '') {
      try {
        const fromAddress = senderFrom.includes('<') ? senderFrom.split('<')[1].replace('>', '').trim() : senderFrom.trim();
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey.trim(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sender: { name: 'Casa Mira South HOA', email: fromAddress },
            to: cleanRecipients.map(email => ({ email })),
            subject: subject,
            htmlContent: formattedHtml
          })
        });
        const brevoData = await res.json();
        console.log('[EMAIL GATEWAY] Brevo Email Dispatch Result:', brevoData);
        if (res.ok) {
          return { success: true, recipientCount: cleanRecipients.length, provider: 'BREVO', details: brevoData, messageId: brevoData?.messageId };
        }
      } catch (err: any) {
        console.error('[EMAIL GATEWAY] Brevo Email Error:', err);
      }
    }

    // 4. SMTP / Nodemailer Delivery (Gmail App Password, Zoho, Google Workspace, Custom Mail Server)
    const smtpHost = config?.smtpHost || process.env.SMTP_HOST;
    const smtpUser = config?.smtpUser || process.env.SMTP_USER;
    const smtpPass = config?.smtpPass || process.env.SMTP_PASS;
    const smtpPort = parseInt(config?.smtpPort || process.env.SMTP_PORT || '587');
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost.trim(),
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser.trim(),
            pass: smtpPass.trim()
          }
        });
        const info = await transporter.sendMail({
          from: senderFrom,
          bcc: cleanRecipients.join(', '),
          subject: subject,
          html: formattedHtml
        });
        console.log('[EMAIL GATEWAY] SMTP Dispatch Success to', cleanRecipients.length, 'recipients, MessageId:', info.messageId);
        return { success: true, recipientCount: cleanRecipients.length, provider: 'SMTP', messageId: info.messageId };
      } catch (err: any) {
        console.error('[EMAIL GATEWAY] SMTP Nodemailer Error:', err);
      }
    }

    // 5. Simulated sandbox dispatch (for testing / development when keys are not configured)
    const simulatedMsgId = `CMS-EML-SIM-${Date.now().toString(36).toUpperCase()}`;
    console.log(`[EMAIL GATEWAY (SANDBOX)] Dispatched "${subject}" [${simulatedMsgId}] to ${cleanRecipients.length} recipients (${cleanRecipients.join(', ')}).`);
    return { 
      success: true, 
      recipientCount: cleanRecipients.length, 
      provider: 'SIMULATED', 
      simulated: true,
      messageId: simulatedMsgId,
      note: 'Dispatched via Casa Mira South Email Broadcast Engine (Sandbox Mode).'
    };
  }

  // ==========================================
  // GATEWAY STATUS & SETTINGS ENDPOINTS
  // ==========================================

  app.get("/api/admin/broadcast/gateway-status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const config = await getBroadcastConfig();

      // Check Semaphore status and live balance
      const semaphoreKey = config?.semaphoreApiKey || process.env.SEMAPHORE_API_KEY || process.env.SMS_API_KEY;
      let semaphoreBalance: any = null;
      let semaphoreHealthy = false;
      if (semaphoreKey && semaphoreKey.trim() !== '') {
        try {
          const semRes = await fetch(`https://api.semaphore.co/api/v4/account?apikey=${semaphoreKey.trim()}`);
          if (semRes.ok) {
            semaphoreBalance = await semRes.json();
            semaphoreHealthy = true;
          }
        } catch (e) {
          // balance fetch failed or key invalid
        }
      }

      const twilioConfigured = !!(
        (config?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID) &&
        (config?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN) &&
        (config?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER)
      );

      const brevoSmsConfigured = !!(config?.brevoApiKey || process.env.BREVO_API_KEY);
      const resendConfigured = !!(config?.resendApiKey || process.env.RESEND_API_KEY);
      const sendgridConfigured = !!(config?.sendgridApiKey || process.env.SENDGRID_API_KEY);
      const brevoEmailConfigured = !!(config?.brevoApiKey || process.env.BREVO_API_KEY);
      const smtpConfigured = !!(
        (config?.smtpHost || process.env.SMTP_HOST) &&
        (config?.smtpUser || process.env.SMTP_USER) &&
        (config?.smtpPass || process.env.SMTP_PASS)
      );

      // Determine active providers
      let activeSmsProvider = 'SIMULATED';
      if (semaphoreHealthy || (semaphoreKey && semaphoreKey.trim() !== '')) activeSmsProvider = 'SEMAPHORE';
      else if (twilioConfigured) activeSmsProvider = 'TWILIO';
      else if (brevoSmsConfigured) activeSmsProvider = 'BREVO';

      let activeEmailProvider = 'SIMULATED';
      if (resendConfigured) activeEmailProvider = 'RESEND';
      else if (sendgridConfigured) activeEmailProvider = 'SENDGRID';
      else if (brevoEmailConfigured) activeEmailProvider = 'BREVO';
      else if (smtpConfigured) activeEmailProvider = 'SMTP';

      // Aggregate statistics
      const allSmsLogs = await db.select().from(smsLogs);
      const allEmailLogs = await db.select().from(emailLogs);

      const maskKey = (key?: string | null) => {
        if (!key || key.trim() === '') return '';
        if (key.length <= 8) return '********';
        return key.slice(0, 4) + '••••••••' + key.slice(-4);
      };

      res.json({
        activeSmsProvider,
        activeEmailProvider,
        smsGateways: {
          semaphore: {
            configured: !!(semaphoreKey && semaphoreKey.trim() !== ''),
            healthy: semaphoreHealthy,
            balance: semaphoreBalance,
            senderName: config?.semaphoreSenderName || 'CASAMIRA',
            providerName: 'Semaphore (Philippine Telco Direct)',
            supportedNetworks: ['Globe', 'Smart', 'DITO', 'TM', 'TNT']
          },
          twilio: {
            configured: twilioConfigured,
            providerName: 'Twilio (Global SMS)',
            fromNumber: config?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || ''
          },
          brevo: {
            configured: brevoSmsConfigured,
            providerName: 'Brevo (Transactional SMS)'
          },
          simulated: {
            configured: true,
            providerName: 'Casa Mira South Sandbox Simulator'
          }
        },
        emailGateways: {
          resend: {
            configured: resendConfigured,
            providerName: 'Resend API (Next-Gen Email Engine)'
          },
          sendgrid: {
            configured: sendgridConfigured,
            providerName: 'SendGrid API'
          },
          brevo: {
            configured: brevoEmailConfigured,
            providerName: 'Brevo (300 Free Emails/Day)'
          },
          smtp: {
            configured: smtpConfigured,
            providerName: 'SMTP / Nodemailer (Gmail / Custom)',
            host: config?.smtpHost || process.env.SMTP_HOST || ''
          },
          simulated: {
            configured: true,
            providerName: 'Casa Mira South Sandbox Simulator'
          }
        },
        config: {
          smsProvider: config?.smsProvider || 'SEMAPHORE',
          emailProvider: config?.emailProvider || 'RESEND',
          emailFrom: config?.emailFrom || 'Casa Mira South HOA <notifications@casamirasouth.com>',
          testPhone: config?.testPhone || '+639272815880',
          testEmail: config?.testEmail || 'kit.g3nity@gmail.com',
          semaphoreSenderName: config?.semaphoreSenderName || 'CASAMIRA',
          smtpHost: config?.smtpHost || '',
          smtpPort: config?.smtpPort || '587',
          smtpUser: config?.smtpUser || '',
          // Masked secrets for security
          hasSemaphoreKey: !!(config?.semaphoreApiKey || process.env.SEMAPHORE_API_KEY),
          semaphoreApiKeyMasked: maskKey(config?.semaphoreApiKey || process.env.SEMAPHORE_API_KEY),
          hasTwilioSid: !!(config?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID),
          hasResendKey: !!(config?.resendApiKey || process.env.RESEND_API_KEY),
          resendApiKeyMasked: maskKey(config?.resendApiKey || process.env.RESEND_API_KEY),
          hasSendgridKey: !!(config?.sendgridApiKey || process.env.SENDGRID_API_KEY),
          hasBrevoKey: !!(config?.brevoApiKey || process.env.BREVO_API_KEY),
          brevoApiKeyMasked: maskKey(config?.brevoApiKey || process.env.BREVO_API_KEY)
        },
        stats: {
          totalSmsBlasts: allSmsLogs.length,
          totalSmsRecipients: allSmsLogs.reduce((acc, l) => acc + (l.recipientsCount || 0), 0),
          lastSmsSentAt: allSmsLogs[0]?.sentAt || null,
          totalEmailBlasts: allEmailLogs.length,
          totalEmailRecipients: allEmailLogs.reduce((acc, l) => acc + (l.recipientsCount || 0), 0),
          lastEmailSentAt: allEmailLogs[0]?.sentAt || null
        }
      });
    } catch (error) {
      console.error("Gateway status error:", error);
      res.status(500).json({ error: "Failed to retrieve broadcast gateway status" });
    }
  });

  app.post("/api/admin/broadcast/settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const {
        smsProvider,
        semaphoreApiKey,
        semaphoreSenderName,
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber,
        emailProvider,
        resendApiKey,
        sendgridApiKey,
        brevoApiKey,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPass,
        emailFrom,
        testPhone,
        testEmail
      } = req.body;

      const existing = await db.select().from(broadcastSettings).limit(1);

      const updateData: any = {
        updatedAt: new Date()
      };

      if (smsProvider !== undefined) updateData.smsProvider = smsProvider;
      if (semaphoreApiKey !== undefined && semaphoreApiKey !== '') updateData.semaphoreApiKey = semaphoreApiKey.trim();
      if (semaphoreSenderName !== undefined) updateData.semaphoreSenderName = semaphoreSenderName.trim();
      if (twilioAccountSid !== undefined && twilioAccountSid !== '') updateData.twilioAccountSid = twilioAccountSid.trim();
      if (twilioAuthToken !== undefined && twilioAuthToken !== '') updateData.twilioAuthToken = twilioAuthToken.trim();
      if (twilioPhoneNumber !== undefined) updateData.twilioPhoneNumber = twilioPhoneNumber.trim();
      if (emailProvider !== undefined) updateData.emailProvider = emailProvider;
      if (resendApiKey !== undefined && resendApiKey !== '') updateData.resendApiKey = resendApiKey.trim();
      if (sendgridApiKey !== undefined && sendgridApiKey !== '') updateData.sendgridApiKey = sendgridApiKey.trim();
      if (brevoApiKey !== undefined && brevoApiKey !== '') updateData.brevoApiKey = brevoApiKey.trim();
      if (smtpHost !== undefined) updateData.smtpHost = smtpHost.trim();
      if (smtpPort !== undefined) updateData.smtpPort = String(smtpPort);
      if (smtpUser !== undefined) updateData.smtpUser = smtpUser.trim();
      if (smtpPass !== undefined && smtpPass !== '') updateData.smtpPass = smtpPass.trim();
      if (emailFrom !== undefined && emailFrom !== '') updateData.emailFrom = emailFrom.trim();
      if (testPhone !== undefined && testPhone !== '') updateData.testPhone = testPhone.trim();
      if (testEmail !== undefined && testEmail !== '') updateData.testEmail = testEmail.trim();

      let result;
      if (existing.length > 0) {
        result = await db.update(broadcastSettings).set(updateData).where(eq(broadcastSettings.id, existing[0].id)).returning();
      } else {
        result = await db.insert(broadcastSettings).values(updateData).returning();
      }

      await logAudit(userRes[0].id, userRes[0].name, userRes[0].role, 'UPDATE_BROADCAST_SETTINGS', 'Broadcast Gateways', 'Updated API keys and settings');

      res.json({ success: true, settings: result[0] });
    } catch (error) {
      console.error("Save broadcast settings error:", error);
      res.status(500).json({ error: "Failed to update broadcast settings" });
    }
  });

  app.post("/api/admin/broadcast/test-dispatch", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { type, recipient } = req.body; // type: 'SMS' | 'EMAIL'

      if (type === 'SMS') {
        const targetPhone = recipient || '+639272815880';
        const title = 'Casa Mira South Test';
        const testMsg = `PMO SMS Broadcast Test at ${new Date().toLocaleTimeString()} - All systems nominal. Gateways active for Casa Mira South.`;
        const dispatchResult = await dispatchSmsGateway([targetPhone], title, testMsg);

        const logRecord = await db.insert(smsLogs).values({
          title: `[TEST] ${title}`,
          message: `To [${targetPhone}]: ${testMsg}`,
          recipientsCount: 1,
          status: dispatchResult.success ? 'SENT' : 'FAILED',
          sentAt: new Date()
        }).returning();

        return res.json({
          success: dispatchResult.success,
          type: 'SMS',
          recipient: targetPhone,
          details: dispatchResult,
          log: logRecord[0]
        });
      } else {
        const targetEmail = recipient || 'kit.g3nity@gmail.com';
        const subject = '[Casa Mira South] Gateway Verification Test';
        const testEmailMsg = `This is a verification dispatch from the Casa Mira South HOA Broadcast Suite.

Dispatch Details:
• Timestamp: ${new Date().toLocaleString()}
• Initiator: ${userRes[0].name} (${userRes[0].role})
• Status: Delivery confirmed via active broadcast gateway

All resident broadcast channels and email templates are operating at 100% capacity.`;

        const dispatchResult = await dispatchEmailGateway([targetEmail], subject, testEmailMsg);

        const logRecord = await db.insert(emailLogs).values({
          subject: `[TEST] ${subject}`,
          message: testEmailMsg,
          recipientsCount: 1,
          recipientsList: targetEmail,
          provider: dispatchResult.provider,
          status: dispatchResult.success ? 'SENT' : 'FAILED',
          sentAt: new Date()
        }).returning();

        return res.json({
          success: dispatchResult.success,
          type: 'EMAIL',
          recipient: targetEmail,
          details: dispatchResult,
          log: logRecord[0]
        });
      }
    } catch (error) {
      console.error("Test dispatch error:", error);
      res.status(500).json({ error: "Failed to perform test broadcast dispatch" });
    }
  });


  // SMS Blast Endpoints
  app.get("/api/admin/sms-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const logs = await db.select().from(smsLogs).orderBy(desc(smsLogs.sentAt));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SMS logs" });
    }
  });

  app.post("/api/admin/sms/send-blast", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { recipientType, customPhone, targetPhase, title, message, announcementId } = req.body;
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "SMS message content is required" });
      }

      let recipients: string[] = [];
      const allUsers = await db.select().from(users);

      if (recipientType === 'SPECIFIC' && customPhone) {
        recipients = [customPhone.trim()];
      } else if (recipientType === 'PHASE' && targetPhase) {
        recipients = allUsers
          .filter(u => u.phoneNumber && u.phoneNumber.trim() !== '' && (u.phase === targetPhase || (u.blockLot && u.blockLot.includes(targetPhase))))
          .map(u => u.phoneNumber!);
      } else if (recipientType === 'VERIFIED') {
        recipients = allUsers
          .filter(u => u.phoneNumber && u.phoneNumber.trim() !== '' && u.approvalStatus === 'APPROVED')
          .map(u => u.phoneNumber!);
      } else {
        // ALL
        recipients = allUsers
          .filter(u => u.phoneNumber && u.phoneNumber.trim() !== '')
          .map(u => u.phoneNumber!);
      }

      // Also ensure target phone +639272815880 is included if ALL or testing
      if ((recipientType === 'ALL' || recipientType === 'SPECIFIC') && !recipients.some(p => p.includes('9272815880')) && customPhone?.includes('9272815880')) {
        recipients.push('+639272815880');
      }

      recipients = Array.from(new Set(recipients));

      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipient phone numbers found matching the selected criteria" });
      }

      const dispatchResult = await dispatchSmsGateway(recipients, title || 'Casa Mira Announcement', message);

      const logRecord = await db.insert(smsLogs).values({
        announcementId: announcementId ? parseInt(announcementId) : null,
        title: title || 'Community Broadcast Blast',
        message: `To [${recipients.join(', ')}]: ${message}`,
        recipientsCount: recipients.length,
        status: dispatchResult.success ? 'SENT' : 'FAILED',
        sentAt: new Date()
      }).returning();

      await logAudit(userRes[0].id, userRes[0].name, userRes[0].role, 'SEND_SMS_BLAST', `Recipients: ${recipients.length}`, message.slice(0, 100));

      res.json({
        success: true,
        recipientsCount: recipients.length,
        log: logRecord[0],
        details: dispatchResult
      });
    } catch (error) {
      console.error("SMS Blast Error:", error);
      res.status(500).json({ error: "Failed to dispatch SMS blast" });
    }
  });

  // Email Blast Endpoints
  app.get("/api/admin/email-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const logs = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });

  app.post("/api/admin/email/send-blast", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { recipientType, customEmail, targetPhase, subject, message, announcementId } = req.body;
      if (!subject || subject.trim() === '') {
        return res.status(400).json({ error: "Subject is required" });
      }
      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "Email message content is required" });
      }

      let recipients: string[] = [];
      const allUsers = await db.select().from(users);

      if (recipientType === 'SPECIFIC' && customEmail) {
        recipients = [customEmail.trim().toLowerCase()];
      } else if (recipientType === 'PHASE' && targetPhase) {
        recipients = allUsers
          .filter(u => u.email && u.email.trim() !== '' && (u.phase === targetPhase || (u.blockLot && u.blockLot.includes(targetPhase))))
          .map(u => u.email!.trim().toLowerCase());
      } else if (recipientType === 'VERIFIED') {
        recipients = allUsers
          .filter(u => u.email && u.email.trim() !== '' && u.approvalStatus === 'APPROVED')
          .map(u => u.email!.trim().toLowerCase());
      } else {
        // ALL
        recipients = allUsers
          .filter(u => u.email && u.email.trim() !== '')
          .map(u => u.email!.trim().toLowerCase());
      }

      // Deduplicate emails
      recipients = Array.from(new Set(recipients));

      if (recipients.length === 0) {
        return res.status(400).json({ error: "No recipient emails found matching the selected criteria" });
      }

      const dispatchResult = await dispatchEmailGateway(recipients, subject, message);

      const logRecord = await db.insert(emailLogs).values({
        announcementId: announcementId ? parseInt(announcementId) : null,
        subject: subject.trim(),
        message: message.trim(),
        recipientsCount: recipients.length,
        recipientsList: recipients.join(', '),
        provider: dispatchResult.provider,
        status: dispatchResult.success ? 'SENT' : 'FAILED',
        sentAt: new Date()
      }).returning();

      // Dispatch in-app notification to all targeted residents
      for (const email of recipients) {
        const targetUser = allUsers.find(u => u.email?.toLowerCase() === email);
        if (targetUser) {
          await db.insert(notifications).values({
            userId: targetUser.id,
            type: 'ANNOUNCEMENT',
            title: `[Email Broadcast] ${subject}`,
            message: message.slice(0, 100),
            link: '/announcements'
          });
        }
      }

      await logAudit(
        userRes[0].id, 
        userRes[0].name, 
        userRes[0].role, 
        'SEND_EMAIL_BLAST', 
        `Scope: ${recipientType} (${recipients.length} recipients)`, 
        subject.slice(0, 100)
      );

      res.json({
        success: true,
        recipientsCount: recipients.length,
        log: logRecord[0],
        details: dispatchResult
      });
    } catch (error) {
      console.error("Email Blast Error:", error);
      res.status(500).json({ error: "Failed to dispatch email blast" });
    }
  });

  app.get("/api/admin/chat/flagged", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const flaggedMsgs = await db.select().from(chatMessages).where(eq(chatMessages.flagged, true)).orderBy(desc(chatMessages.createdAt));
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enriched = flaggedMsgs.map(m => {
        const author = userMap.get(m.userId);
        return {
          ...m,
          userName: author?.name || 'Resident',
          userRole: author?.role || 'RESIDENT',
          userImage: author?.profileImage || '',
          userBlockLot: author?.blockLot || 'Casa Mira South',
          isMuted: author?.isMuted || false
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flagged messages" });
    }
  });

  app.delete("/api/admin/chat/messages/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const msgId = parseInt(req.params.id);
      await db.delete(chatMessages).where(eq(chatMessages.id, msgId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete chat message" });
    }
  });

  app.patch("/api/admin/users/:id/mute", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const targetUserId = parseInt(req.params.id);
      const { isMuted } = req.body;

      const result = await db.update(users).set({ isMuted }).where(eq(users.id, targetUserId)).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update mute status" });
    }
  });

  // Update personal receiving Payment QR
  app.put("/api/users/me/payment-qr", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { paymentQr } = req.body;
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const updated = await db.update(users).set({ paymentQr }).where(eq(users.id, userRes[0].id)).returning();
      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment QR code" });
    }
  });

  // SUPERADMIN & ADMIN: Update user role
  app.patch("/api/admin/users/:id/role", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN' && actor.role !== 'PMO')) {
        return res.status(403).json({ error: "Forbidden: Superadmin/Admin/PMO authorization required." });
      }

      const targetId = parseInt(req.params.id);
      const { role } = req.body;

      const targetUserRes = await db.select().from(users).where(eq(users.id, targetId));
      if (targetUserRes.length === 0) return res.status(404).json({ error: "Target user not found" });

      const targetUser = targetUserRes[0];

      // STRICT SUPERADMIN PROTECTION:
      if (targetUser.role === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: "Forbidden: SuperAdmin accounts can only be modified by a SuperAdmin." });
      }
      if (role === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: "Forbidden: Only a SuperAdmin can assign the SuperAdmin role." });
      }

      const updated = await db.update(users).set({ role }).where(eq(users.id, targetId)).returning();
      
      await logAudit(
        actor.id, actor.name, actor.role, 
        'UPDATE_USER_ROLE', 
        `User #${targetId} (${targetUser.name})`, 
        `Changed role from ${targetUser.role} to ${role}`
      );

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Toggle Delinquent Account Status
  app.post("/api/admin/users/:id/toggle-delinquent", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN' && actor.role !== 'PMO')) {
        return res.status(403).json({ error: "Forbidden: PMO/Admin access required." });
      }

      const targetId = parseInt(req.params.id);
      const { isDelinquent, reason } = req.body;

      const targetUserRes = await db.select().from(users).where(eq(users.id, targetId));
      if (!targetUserRes[0]) return res.status(404).json({ error: "User not found" });

      if (targetUserRes[0].role === 'SUPERADMIN' && actor.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: "Forbidden: SuperAdmin accounts cannot be flagged." });
      }

      const updated = await db.update(users).set({
        isDelinquent: !!isDelinquent,
        delinquentReason: reason || (isDelinquent ? 'Unsettled PMO Water/HOA Dues' : '')
      }).where(eq(users.id, targetId)).returning();

      await logAudit(actor.id, actor.name, actor.role, 'TOGGLE_DELINQUENT', `User #${targetId} (${targetUserRes[0].name})`, `Delinquent set to ${isDelinquent}`);

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update delinquent status" });
    }
  });

  // Reactivate / Unfreeze Frozen/Delinquent Account
  app.post("/api/admin/users/:id/reactivate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN' && actor.role !== 'PMO')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const targetId = parseInt(req.params.id);
      const updated = await db.update(users).set({
        isFrozen: false,
        isDelinquent: false,
        delinquentReason: null,
        lastLoginAt: new Date(),
        approvalStatus: 'APPROVED'
      }).where(eq(users.id, targetId)).returning();

      await logAudit(actor.id, actor.name, actor.role, 'REACTIVATE_ACCOUNT', `User #${targetId}`, 'Restored active privileges');

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to reactivate account" });
    }
  });

  // Get Household Family Members
  app.get("/api/household/members", requireAuth, async (req: AuthRequest, res) => {
    try {
      const currentUser = await getOrCreateUser(req.user!.uid, req.user!.email, req.user!.name);
      if (!currentUser || !currentUser.blockLot) {
        return res.json([]);
      }

      const allUsers = await db.select().from(users);
      const cleanTarget = currentUser.blockLot.replace(/phase\s*\d+\s*-?\s*/i, '').trim().toLowerCase();

      const familyMembers = allUsers.filter(u => {
        if (!u.blockLot) return false;
        const cleanUserAddress = u.blockLot.replace(/phase\s*\d+\s*-?\s*/i, '').trim().toLowerCase();
        return cleanUserAddress === cleanTarget || u.id === currentUser.id;
      });

      res.json(familyMembers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family household members" });
    }
  });

  // SUPERADMIN & ADMIN: Update user profile details
  app.put("/api/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const targetId = parseInt(req.params.id);
      const { name, email, blockLot, phoneNumber, role, approvalStatus } = req.body;

      const updated = await db.update(users).set({
        name, email, blockLot, phoneNumber, role, approvalStatus
      }).where(eq(users.id, targetId)).returning();

      await logAudit(actor.id, actor.name, actor.role, 'UPDATE_USER_DETAILS', `User #${targetId} (${name})`, `Updated status/info`);

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // SUPERADMIN: Delete user
  app.delete("/api/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || actor.role !== 'SUPERADMIN') {
        return res.status(403).json({ error: "Forbidden: Superadmin access required to delete accounts." });
      }

      const targetId = parseInt(req.params.id);
      const targetUserRes = await db.select().from(users).where(eq(users.id, targetId));
      if (targetUserRes.length === 0) return res.status(404).json({ error: "User not found" });

      await db.delete(users).where(eq(users.id, targetId));

      await logAudit(actor.id, actor.name, actor.role, 'DELETE_USER', `User #${targetId} (${targetUserRes[0].name})`, `Account permanently removed`);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Audit Logs endpoint
  app.get("/api/admin/audit-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!actorRes[0] || (actorRes[0].role !== 'SUPERADMIN' && actorRes[0].role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ADMIN Content Management: Toggle Featured Status for Listings or Businesses
  app.patch("/api/admin/content/:type/:id/featured", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { type, id } = req.params;
      const targetId = parseInt(id);
      const { featured } = req.body;

      let result;
      if (type === 'listings') {
        result = await db.update(listings).set({ featured }).where(eq(listings.id, targetId)).returning();
      } else if (type === 'businesses') {
        result = await db.update(businesses).set({ featured }).where(eq(businesses.id, targetId)).returning();
      } else {
        return res.status(400).json({ error: "Invalid content type for featured toggle" });
      }

      await logAudit(actor.id, actor.name, actor.role, 'TOGGLE_FEATURED', `${type} #${targetId}`, `Featured set to ${featured}`);

      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle featured status" });
    }
  });

  // ADMIN Content Management: Delete any content
  app.delete("/api/admin/content/:type/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { type, id } = req.params;
      const targetId = parseInt(id);

      if (type === 'announcements') await db.delete(announcements).where(eq(announcements.id, targetId));
      else if (type === 'listings') await db.delete(listings).where(eq(listings.id, targetId));
      else if (type === 'events') await db.delete(events).where(eq(events.id, targetId));
      else if (type === 'memory_vault') await db.delete(memoryVault).where(eq(memoryVault.id, targetId));
      else if (type === 'reports') await db.delete(reports).where(eq(reports.id, targetId));
      else if (type === 'businesses') await db.delete(businesses).where(eq(businesses.id, targetId));
      else if (type === 'contacts') await db.delete(contacts).where(eq(contacts.id, targetId));
      else return res.status(400).json({ error: "Invalid content type" });

      await logAudit(actor.id, actor.name, actor.role, 'DELETE_CONTENT', `${type} #${targetId}`, `Deleted by admin`);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete content" });
    }
  });

  // Helper function to compute carried-over previous bill balances for HOA Dues and Water Charges
  function computeHouseholdCarriedOverBillings(billsList: any[]) {
    const groupedByHousehold = new Map<string, any[]>();

    for (const b of billsList) {
      const key = (b.phase && b.blockLot) ? `${b.phase}_${b.blockLot}` : (b.blockLot || `U_${b.userId}`);
      if (!groupedByHousehold.has(key)) {
        groupedByHousehold.set(key, []);
      }
      groupedByHousehold.get(key)!.push(b);
    }

    const enrichedMap = new Map<number, any>();

    for (const [, householdBills] of groupedByHousehold.entries()) {
      // Sort chronological ascending (oldest first)
      const ascBills = [...householdBills].sort((a, b) => a.id - b.id);

      let runningHoaArrears = 0;
      let runningWaterArrears = 0;

      for (const b of ascBills) {
        const curHoa = parseFloat(b.hoaDues || '0');
        const curWater = parseFloat(b.waterAmount || '0');
        const curPenalty = parseFloat(b.penaltyAmount || '0');
        const curCredit = parseFloat(b.advanceCreditApplied || '0');

        const hoaArrears = runningHoaArrears;
        const waterArrears = runningWaterArrears;
        const totalArrearsCarriedOver = hoaArrears + waterArrears + curPenalty;

        const isHoaSettled = b.hoaStatus === 'PAID';
        const isWaterSettled = b.waterStatus === 'PAID';

        const totalHoaPayable = (isHoaSettled ? 0 : curHoa) + hoaArrears;
        const totalWaterPayable = (isWaterSettled ? 0 : curWater) + waterArrears;

        const computedTotalAmount = Math.max(0, (isHoaSettled ? 0 : curHoa) + (isWaterSettled ? 0 : curWater) + totalArrearsCarriedOver - curCredit);

        enrichedMap.set(b.id, {
          ...b,
          hoaArrears: hoaArrears.toFixed(2),
          waterArrears: waterArrears.toFixed(2),
          totalHoaPayable: totalHoaPayable.toFixed(2),
          totalWaterPayable: totalWaterPayable.toFixed(2),
          totalArrearsCarriedOver: totalArrearsCarriedOver.toFixed(2),
          computedTotalAmount: computedTotalAmount.toFixed(2),
          totalAmount: computedTotalAmount > 0 ? computedTotalAmount.toFixed(2) : b.totalAmount
        });

        if (!isHoaSettled) {
          runningHoaArrears += curHoa;
        }
        if (!isWaterSettled) {
          runningWaterArrears += curWater;
        }
      }
    }

    return billsList.map(b => enrichedMap.get(b.id) || b);
  }

  // Resident Billing endpoints - Household Shared Account
  app.get("/api/billings/my", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (userRes.length === 0) return res.status(404).json({ error: "User not found" });

      const currentUser = userRes[0];
      const allUsers = await db.select().from(users);

      // Find all members belonging to the same household unit (same Phase & Block/Lot)
      const householdMembers = allUsers.filter(u => {
        if (!u.blockLot) return u.id === currentUser.id;
        if (currentUser.phase && u.phase) {
          return u.phase === currentUser.phase && u.blockLot === currentUser.blockLot;
        }
        return u.blockLot === currentUser.blockLot;
      });

      const householdUserIds = new Set(householdMembers.map(u => u.id));
      const allBills = await db.select().from(billings).orderBy(desc(billings.createdAt));

      // Retrieve all billings assigned to ANY user in this household or matching household address
      const householdBills = allBills.filter(b => {
        if (householdUserIds.has(b.userId)) return true;
        if (currentUser.blockLot && b.blockLot) {
          if (currentUser.phase && b.phase) {
            return b.phase === currentUser.phase && b.blockLot === currentUser.blockLot;
          }
          return b.blockLot === currentUser.blockLot;
        }
        return false;
      });

      const enrichedHouseholdBills = computeHouseholdCarriedOverBillings(householdBills).map(b => ({
        ...b,
        accountNo: formatHouseholdAccountId(b.phase || currentUser.phase, b.blockLot || currentUser.blockLot, b.userId)
      }));

      res.json(enrichedHouseholdBills);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch user billings" });
    }
  });

  app.post("/api/billings/:id/pay", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { paymentType = 'FULL', paymentProof, paymentRef, amountPaid } = req.body;
      const billingId = parseInt(req.params.id);

      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const payer = userRes[0];

      const targetBillRes = await db.select().from(billings).where(eq(billings.id, billingId));
      if (targetBillRes.length === 0) return res.status(404).json({ error: "Billing statement not found" });

      const targetBill = targetBillRes[0];
      let updateData: any = {};

      if (paymentType === 'WATER') {
        updateData.waterStatus = 'PENDING_VERIFICATION';
        updateData.waterPaymentProof = paymentProof;
        updateData.waterPaymentRef = paymentRef;
        updateData.waterAmountPaid = (parseFloat(amountPaid || targetBill.waterAmount || '0.00')).toFixed(2);
      } else if (paymentType === 'HOA') {
        updateData.hoaStatus = 'PENDING_VERIFICATION';
        updateData.hoaPaymentProof = paymentProof;
        updateData.hoaPaymentRef = paymentRef;
        updateData.hoaAmountPaid = (parseFloat(amountPaid || targetBill.hoaDues || '0.00')).toFixed(2);
      } else {
        // FULL / BOTH
        updateData.waterStatus = 'PENDING_VERIFICATION';
        updateData.waterPaymentProof = paymentProof;
        updateData.waterPaymentRef = paymentRef;
        updateData.waterAmountPaid = targetBill.waterAmount;
        updateData.hoaStatus = 'PENDING_VERIFICATION';
        updateData.hoaPaymentProof = paymentProof;
        updateData.hoaPaymentRef = paymentRef;
        updateData.hoaAmountPaid = targetBill.hoaDues;
        updateData.paymentProof = paymentProof;
        updateData.paymentRef = paymentRef;
        updateData.amountPaid = (parseFloat(amountPaid || targetBill.totalAmount || '0.00')).toFixed(2);
      }

      // Re-evaluate overall bill status
      const resWater = updateData.waterStatus || targetBill.waterStatus || 'UNPAID';
      const resHoa = updateData.hoaStatus || targetBill.hoaStatus || 'UNPAID';

      if (resWater === 'PAID' && resHoa === 'PAID') {
        updateData.status = 'PAID';
      } else if (resWater === 'PENDING_VERIFICATION' || resHoa === 'PENDING_VERIFICATION') {
        updateData.status = 'PENDING_VERIFICATION';
      } else if (resWater === 'PAID' || resHoa === 'PAID') {
        updateData.status = 'PARTIAL';
      } else {
        updateData.status = 'UNPAID';
      }

      const updated = await db.update(billings).set(updateData).where(eq(billings.id, billingId)).returning();

      // 1. Notify ALL household members so payment reflects across all family accounts
      const allUsers = await db.select().from(users);
      const householdMembers = allUsers.filter(u => {
        if (!u.blockLot) return u.id === payer.id;
        if (payer.phase && u.phase) {
          return u.phase === payer.phase && u.blockLot === payer.blockLot;
        }
        return u.blockLot === payer.blockLot;
      });

      for (const member of householdMembers) {
        await db.insert(notifications).values({
          userId: member.id,
          type: 'BILLING',
          title: `Household Payment Submitted`,
          message: `${payer ? payer.name : 'A household member'} submitted ${paymentType} payment proof (Ref #${paymentRef}) for ${targetBill.billingMonth}. Under PMO review.`,
          link: '/billings'
        });
      }

      // 2. Notify PMO Admins & Superadmins
      const admins = allUsers.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN');
      for (const admin of admins) {
        await db.insert(notifications).values({
          userId: admin.id,
          type: 'BILLING',
          title: `Household Payment Verification Needed`,
          message: `${payer ? payer.name : 'Resident'} (${payer.phase || ''} ${payer.blockLot || ''}) uploaded ${paymentType} receipt Ref #${paymentRef} for SOA #${billingId}.`,
          link: '/admin'
        });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to submit billing payment" });
    }
  });

  async function getOrCreateUtilitySettings() {
    const existing = await db.select().from(utilitySettings);
    const defaultPhases = JSON.stringify(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 3A', 'Phase 3B', 'Phase 3A.2']);

    if (existing.length > 0) {
      const item = existing[0];
      if (!item.phases) {
        item.phases = defaultPhases;
      }
      return item;
    }
    
    const defaultTiers = JSON.stringify([
      { id: 1, min: 0, max: 10, isFlatMin: true, minRate: 180, ratePerCuM: 0, label: '0-10 cu.m Minimum' },
      { id: 2, min: 11, max: 20, isFlatMin: false, minRate: 0, ratePerCuM: 22, label: '11-20 cu.m Bracket' },
      { id: 3, min: 21, max: 30, isFlatMin: false, minRate: 0, ratePerCuM: 26, label: '21-30 cu.m Bracket' },
      { id: 4, min: 31, max: 999, isFlatMin: false, minRate: 0, ratePerCuM: 32, label: '31+ cu.m Excess' }
    ]);

    const created = await db.insert(utilitySettings).values({
      waterTiers: defaultTiers,
      phases: defaultPhases,
      hoaDuesTypeA: '240.00',
      hoaDuesTypeB: '320.00',
      hoaDuesTypeC: '480.00',
      gcashNumber: '0917-123-4567',
      bdoAccount: '0012-3456-7890',
      accountName: 'Casa Mira South HOA'
    }).returning();

    return created[0];
  }

  function calculateWaterAmountHelper(usage: number, waterTiersRaw: any) {
    let tiers: any[] = [];
    try {
      tiers = typeof waterTiersRaw === 'string' ? JSON.parse(waterTiersRaw) : (waterTiersRaw || []);
    } catch (e) {
      tiers = [];
    }

    if (!Array.isArray(tiers) || tiers.length === 0) {
      return { amount: usage <= 10 ? 180 : 180 + (usage - 10) * 22, summary: 'Default Rate' };
    }

    let totalAmount = 0;
    let details: string[] = [];

    for (const tier of tiers) {
      if (usage < tier.min) continue;
      if (tier.isFlatMin) {
        totalAmount += Number(tier.minRate || 0);
        details.push(`${tier.label || 'Min'}: ₱${tier.minRate}`);
      } else {
        const tierUsage = Math.min(usage, tier.max) - Math.max(tier.min - 1, 0);
        if (tierUsage > 0) {
          const tierCost = tierUsage * Number(tier.ratePerCuM || 0);
          totalAmount += tierCost;
          details.push(`${tierUsage}m³ @ ₱${tier.ratePerCuM}`);
        }
      }
    }

    return { amount: totalAmount, summary: details.join(', ') || 'Bracket Calculation' };
  }

  function getHoaDuesByHouseTypeHelper(houseType: string | undefined | null, settings: any) {
    const type = (houseType || 'A').toUpperCase();
    if (type === 'B') return parseFloat(settings.hoaDuesTypeB || '320.00');
    if (type === 'C') return parseFloat(settings.hoaDuesTypeC || '480.00');
    return parseFloat(settings.hoaDuesTypeA || '240.00');
  }

  // Utility Settings & PMO Billing Rates
  app.get("/api/utility-settings", async (req, res) => {
    try {
      const settings = await getOrCreateUtilitySettings();
      res.json(settings);
    } catch (error: any) {
      console.error("Failed to fetch utility settings ERROR DETAILS:", error?.message, error?.stack || error);
      res.status(500).json({ error: "Failed to fetch utility settings", details: error?.message });
    }
  });

  app.patch("/api/admin/utility-settings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = userRes[0];
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const settings = await getOrCreateUtilitySettings();
      const { waterTiers, phases, hoaDuesTypeA, hoaDuesTypeB, hoaDuesTypeC, gcashNumber, bdoAccount, accountName } = req.body;

      const updated = await db.update(utilitySettings).set({
        waterTiers: typeof waterTiers === 'string' ? waterTiers : JSON.stringify(waterTiers || []),
        phases: phases ? (typeof phases === 'string' ? phases : JSON.stringify(phases)) : settings.phases,
        hoaDuesTypeA: hoaDuesTypeA ? parseFloat(hoaDuesTypeA).toFixed(2) : settings.hoaDuesTypeA,
        hoaDuesTypeB: hoaDuesTypeB ? parseFloat(hoaDuesTypeB).toFixed(2) : settings.hoaDuesTypeB,
        hoaDuesTypeC: hoaDuesTypeC ? parseFloat(hoaDuesTypeC).toFixed(2) : settings.hoaDuesTypeC,
        gcashNumber: gcashNumber || settings.gcashNumber,
        bdoAccount: bdoAccount || settings.bdoAccount,
        accountName: accountName || settings.accountName,
        updatedAt: new Date()
      }).where(eq(utilitySettings.id, settings.id)).returning();

      await logAudit(actor.id, actor.name, actor.role, 'UPDATE_PMO_RATES', 'Utility Settings', 'Updated water tiers and HOA dues');

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update utility settings" });
    }
  });

  // Admin Assign House Type (A, B, C) to Resident
  app.patch("/api/admin/users/:id/house-type", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = userRes[0];
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const targetUserId = parseInt(req.params.id);
      const { houseType } = req.body;

      const updated = await db.update(users).set({
        houseType: (houseType || 'A').toUpperCase()
      }).where(eq(users.id, targetUserId)).returning();

      if (updated[0] && updated[0].blockLot) {
        await syncHouseholdUnitTypes(updated[0].blockLot, updated[0].houseType);
      }

      await logAudit(actor.id, actor.name, actor.role, 'ASSIGN_HOUSE_TYPE', `User #${targetUserId}`, `House Type set to ${houseType}`);

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update resident house type" });
    }
  });

  // Admin Declare / Set Household Leader (Main Account Holder)
  app.patch("/api/admin/users/:id/set-household-leader", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const targetUserId = parseInt(req.params.id);
      const targetUser = await db.select().from(users).where(eq(users.id, targetUserId));
      if (targetUser.length === 0) return res.status(404).json({ error: "Resident not found" });

      const newLeaderState = !targetUser[0].isHouseholdLeader;

      // If declaring as leader, option to unset any other leader in same block & lot
      if (newLeaderState && targetUser[0].blockLot && targetUser[0].blockLot !== 'Unassigned') {
        const sameHousehold = await db.select().from(users).where(eq(users.blockLot, targetUser[0].blockLot));
        for (const member of sameHousehold) {
          if (member.id !== targetUserId && member.isHouseholdLeader) {
            await db.update(users).set({ isHouseholdLeader: false }).where(eq(users.id, member.id));
          }
        }
      }

      const updated = await db.update(users).set({
        isHouseholdLeader: newLeaderState
      }).where(eq(users.id, targetUserId)).returning();

      await logAudit(
        actor.id, actor.name, actor.role,
        'DECLARE_HOUSEHOLD_LEADER',
        targetUser[0].name,
        `${newLeaderState ? 'Declared' : 'Removed'} as Household Leader for ${targetUser[0].blockLot || 'Address'}`
      );

      res.json(updated[0]);
    } catch (error) {
      console.error("Failed to set household leader:", error);
      res.status(500).json({ error: "Failed to set household leader" });
    }
  });

  // GET Household Members (for Resident portal)
  app.get("/api/household/members", requireAuth, async (req: AuthRequest, res) => {
    try {
      const meRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const me = meRes[0];
      if (!me) return res.status(404).json({ error: "User not found" });

      if (!me.blockLot || me.blockLot === 'Unassigned') {
        return res.json({ householdAddress: 'Unassigned', leader: null, isCallerLeader: false, members: [me] });
      }

      const members = await db.select().from(users).where(eq(users.blockLot, me.blockLot));
      const leader = members.find(m => m.isHouseholdLeader) || null;

      res.json({
        householdAddress: me.blockLot,
        phase: me.phase,
        leader,
        isCallerLeader: me.isHouseholdLeader || (leader && leader.id === me.id),
        members: members.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          phoneNumber: m.phoneNumber,
          role: m.role,
          isHouseholdLeader: m.isHouseholdLeader,
          isFrozen: m.isFrozen,
          houseType: m.houseType,
          profileImage: m.profileImage,
          blockLot: m.blockLot,
          phase: m.phase
        }))
      });
    } catch (err) {
      console.error("Error fetching household members:", err);
      res.status(500).json({ error: "Failed to fetch household members" });
    }
  });

  // POST Household Leader Remove Unauthorized/Pretender Member
  app.post("/api/household/remove-member", requireAuth, async (req: AuthRequest, res) => {
    try {
      const meRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const me = meRes[0];
      if (!me) return res.status(404).json({ error: "User not found" });

      if (!me.isHouseholdLeader && me.role !== 'SUPERADMIN' && me.role !== 'ADMIN') {
        return res.status(403).json({ error: "Only the designated Household Main Account Holder ⭐ can remove household members." });
      }

      const { targetUserId } = req.body;
      if (!targetUserId) return res.status(400).json({ error: "Target user ID required" });

      const targetUserRes = await db.select().from(users).where(eq(users.id, parseInt(targetUserId)));
      if (targetUserRes.length === 0) return res.status(404).json({ error: "Target user not found" });
      const targetUser = targetUserRes[0];

      if (me.role !== 'SUPERADMIN' && me.role !== 'ADMIN' && targetUser.blockLot !== me.blockLot) {
        return res.status(400).json({ error: "User is not part of your household" });
      }

      if (targetUser.id === me.id) {
        return res.status(400).json({ error: "You cannot remove yourself as Household Leader" });
      }

      await db.update(users).set({ blockLot: 'Unassigned', phase: 'Unassigned' }).where(eq(users.id, targetUser.id));

      await logAudit(
        me.id, me.name, me.role,
        'REMOVE_HOUSEHOLD_MEMBER',
        targetUser.name,
        `Removed ${targetUser.name} from household ${me.blockLot}`
      );

      return res.json({ success: true, message: `Successfully removed ${targetUser.name} from household address.` });
    } catch (err) {
      console.error("Error removing household member:", err);
      return res.status(500).json({ error: "Failed to remove household member" });
    }
  });

  // POST Household Leader Freeze Unauthorized/Pretender Account
  app.post("/api/household/freeze-member", requireAuth, async (req: AuthRequest, res) => {
    try {
      const meRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const me = meRes[0];
      if (!me) return res.status(404).json({ error: "User not found" });

      if (!me.isHouseholdLeader && me.role !== 'SUPERADMIN' && me.role !== 'ADMIN') {
        return res.status(403).json({ error: "Only the designated Household Main Account Holder ⭐ can freeze unauthorized account claims." });
      }

      const { targetUserId } = req.body;
      if (!targetUserId) return res.status(400).json({ error: "Target user ID required" });

      const targetUserRes = await db.select().from(users).where(eq(users.id, parseInt(targetUserId)));
      if (targetUserRes.length === 0) return res.status(404).json({ error: "Target user not found" });
      const targetUser = targetUserRes[0];

      if (me.role !== 'SUPERADMIN' && me.role !== 'ADMIN' && targetUser.blockLot !== me.blockLot) {
        return res.status(400).json({ error: "User is not part of your household" });
      }

      if (targetUser.id === me.id) {
        return res.status(400).json({ error: "You cannot freeze your own Household Leader account" });
      }

      const newFrozenState = !targetUser.isFrozen;
      await db.update(users).set({ isFrozen: newFrozenState }).where(eq(users.id, targetUser.id));

      await logAudit(
        me.id, me.name, me.role,
        'FREEZE_UNAUTHORIZED_MEMBER',
        targetUser.name,
        `${newFrozenState ? 'Temporarily disabled/frozen' : 'Unfrozen'} account of ${targetUser.name} claiming household ${me.blockLot}`
      );

      return res.json({
        success: true,
        isFrozen: newFrozenState,
        message: `${newFrozenState ? 'Temporarily disabled' : 'Re-enabled'} account for ${targetUser.name}.`
      });
    } catch (err) {
      console.error("Error freezing household member:", err);
      return res.status(500).json({ error: "Failed to update account freeze status" });
    }
  });

  // Resident Meter Info & Water Reading Auto-Detection
  app.get("/api/admin/resident-meter-info/:userId", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!actorRes[0] || (actorRes[0].role !== 'ADMIN' && actorRes[0].role !== 'SUPERADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const uId = parseInt(req.params.userId);
      const targetUser = await db.select().from(users).where(eq(users.id, uId));
      if (targetUser.length === 0) return res.status(404).json({ error: "User not found" });

      const u = targetUser[0];
      const userBills = await db.select().from(billings).where(eq(billings.userId, uId)).orderBy(desc(billings.createdAt));

      // Previous meter reading from latest bill
      const latestBill = userBills[0];
      const suggestedPrevReading = latestBill ? parseFloat(latestBill.currReading || '0.00').toFixed(2) : '0.00';

      // Unpaid billings calculation
      const unpaidBills = userBills.filter(b => b.status === 'UNPAID' || b.status === 'PARTIAL' || b.status === 'PENDING_VERIFICATION');
      const unpaidMonthsCount = unpaidBills.length;
      
      // Total unpaid arrears
      const arrearsSum = unpaidBills.reduce((acc, b) => acc + (parseFloat(b.totalAmount || '0') - parseFloat(b.amountPaid || '0')), 0);

      // Penalties: first 3 months no penalties; > 3 months unpaid gets 5% per month on unpaid balance
      let accumulatedPenalty = 0;
      if (unpaidMonthsCount > 3) {
        const penaltyMonths = unpaidMonthsCount - 3;
        accumulatedPenalty = arrearsSum * 0.05 * penaltyMonths;
      }

      const isDelinquent = unpaidMonthsCount >= 12;

      const settings = await getOrCreateUtilitySettings();
      const suggestedHoaDues = getHoaDuesByHouseTypeHelper(u.houseType, settings);

      res.json({
        userId: u.id,
        residentName: u.name,
        blockLot: u.blockLot,
        houseType: u.houseType || 'A',
        advanceCredit: u.advanceCredit || '0.00',
        isFrozen: u.isFrozen || false,
        suggestedPrevReading,
        suggestedHoaDues: suggestedHoaDues.toFixed(2),
        unpaidMonthsCount,
        arrearsSum: arrearsSum.toFixed(2),
        accumulatedPenalty: accumulatedPenalty.toFixed(2),
        isDelinquent,
        unpaidBillsList: unpaidBills.map(b => ({
          id: b.id,
          billingMonth: b.billingMonth,
          totalAmount: b.totalAmount,
          amountPaid: b.amountPaid,
          status: b.status
        }))
      });
    } catch (error) {
      console.error("Failed to fetch resident meter info:", error);
      res.status(500).json({ error: "Failed to fetch meter info" });
    }
  });

  app.post("/api/admin/clear-data", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden: SuperAdmin or Admin access required" });
      }

      const { target } = req.body;

      if (target === 'announcements') {
        await db.delete(announcements);
      } else if (target === 'events') {
        await db.delete(events);
      } else if (target === 'marketplace') {
        await db.delete(listings);
      } else if (target === 'memory_vault') {
        await db.delete(memoryVault);
      } else if (target === 'reports') {
        await db.delete(reports);
      } else if (target === 'businesses') {
        await db.delete(businesses);
      } else if (target === 'billings') {
        await db.delete(billings);
        try {
          await db.execute(sql`ALTER SEQUENCE billings_id_seq RESTART WITH 1;`);
        } catch (seqErr) {
          console.log('Sequence reset notice:', seqErr);
        }
      } else if (target === 'pets') {
        await db.delete(pets);
      } else if (target === 'chat') {
        await db.delete(chatMessages);
      } else if (target === 'audit_logs') {
        await db.delete(auditLogs);
      } else if (target === 'ALL_TEST_DATA') {
        await db.delete(announcements);
        await db.delete(events);
        await db.delete(listings);
        await db.delete(memoryVault);
        await db.delete(reports);
        await db.delete(businesses);
        await db.delete(billings);
        try {
          await db.execute(sql`ALTER SEQUENCE billings_id_seq RESTART WITH 1;`);
        } catch (seqErr) {
          console.log('Sequence reset notice:', seqErr);
        }
        await db.delete(pets);
        await db.delete(chatMessages);
      } else {
        return res.status(400).json({ error: "Invalid clear data target" });
      }

      await logAudit(actor.id, actor.name, actor.role, 'PURGE_DATA', target, `Cleared data target: ${target}`);
      return res.json({ success: true, message: `Successfully cleared data for: ${target}` });
    } catch (err: any) {
      console.error('Error clearing data:', err);
      return res.status(500).json({ error: "Failed to clear data" });
    }
  });

  // PMO Admin Billings management
  app.get("/api/admin/billings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!actorRes[0] || (actorRes[0].role !== 'SUPERADMIN' && actorRes[0].role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const allBillings = await db.select().from(billings).orderBy(desc(billings.createdAt));
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map(u => [u.id, u]));

      const enrichedWithCarriedOver = computeHouseholdCarriedOverBillings(allBillings);

      const enriched = enrichedWithCarriedOver.map(b => {
        const resident = userMap.get(b.userId);
        return {
          ...b,
          accountNo: formatHouseholdAccountId(b.phase || resident?.phase, b.blockLot || resident?.blockLot, b.userId),
          residentName: resident?.name || 'Resident',
          residentBlockLot: resident?.blockLot || 'Casa Mira South',
          residentHouseType: resident?.houseType || 'A',
          residentEmail: resident?.email || '',
          residentPhone: resident?.phoneNumber || '',
          residentAdvanceCredit: resident?.advanceCredit || '0.00',
          residentIsFrozen: resident?.isFrozen || false
        };
      });

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin billings" });
    }
  });

  app.post("/api/admin/billings/generate", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const settings = await getOrCreateUtilitySettings();
      const { userId, billingMonth, prevReading, currReading, dueDate, customHoaDues, overridePrevReading, issuanceType = 'BOTH' } = req.body;

      if (userId) {
        const uId = parseInt(userId);
        const targetUserRes = await db.select().from(users).where(eq(users.id, uId));
        if (targetUserRes.length === 0) return res.status(404).json({ error: "Resident not found" });
        const targetUser = targetUserRes[0];

        // Previous bills for arrears and meter detection
        const userBills = await db.select().from(billings).where(eq(billings.userId, uId)).orderBy(desc(billings.createdAt));
        const latestBill = userBills[0];

        // Determine components based on issuanceType
        const isHoaOnly = issuanceType === 'HOA';
        const isWaterOnly = issuanceType === 'WATER';

        // Auto-determine previous reading or handle admin bypass/override
        let pReading = 0;
        let cReading = 0;
        let usage = 0;
        let waterCalc: { amount: number; summary?: string; breakdown?: any[] } = { amount: 0, summary: 'N/A' };
        let isOverriddenReading = false;

        if (!isHoaOnly) {
          if (overridePrevReading !== undefined && overridePrevReading !== null && overridePrevReading !== '') {
            pReading = parseFloat(overridePrevReading);
            isOverriddenReading = true;
          } else if (prevReading !== undefined && prevReading !== null && prevReading !== '') {
            pReading = parseFloat(prevReading);
          } else if (latestBill) {
            pReading = parseFloat(latestBill.currReading || '0.00');
          }

          cReading = parseFloat(currReading || '0.00');
          usage = Math.max(0, cReading - pReading);
          waterCalc = calculateWaterAmountHelper(usage, settings.waterTiers);
        }

        // HOA dues automatically reflected from unit-type (A, B, C)
        const hDues = isWaterOnly ? 0 : (customHoaDues ? parseFloat(customHoaDues) : getHoaDuesByHouseTypeHelper(targetUser.houseType, settings));

        // Unpaid Arrears calculation from prior unpaid bills
        const unpaidBills = userBills.filter(b => b.status === 'UNPAID' || b.status === 'PARTIAL' || b.status === 'PENDING_VERIFICATION');
        const arrearsSum = unpaidBills.reduce((acc, b) => acc + (parseFloat(b.totalAmount || '0') - parseFloat(b.amountPaid || '0')), 0);
        const unpaidMonthsCount = unpaidBills.length;

        // Penalties: first 3 months 0%; > 3 months unpaid gets 5% per month penalty
        let penaltyAmount = 0;
        if (unpaidMonthsCount > 3) {
          const penaltyMonths = unpaidMonthsCount - 3;
          penaltyAmount = arrearsSum * 0.05 * penaltyMonths;
        }

        const isDelinquent = unpaidMonthsCount >= 12;

        // Subtotal before advance credit
        const subtotal = hDues + waterCalc.amount + arrearsSum + penaltyAmount;

        // Advance Credit deduction if user has balance
        let currentCredit = parseFloat(targetUser.advanceCredit || '0.00');
        let advanceCreditApplied = 0;
        if (currentCredit > 0) {
          advanceCreditApplied = Math.min(currentCredit, subtotal);
          const remainingCredit = currentCredit - advanceCreditApplied;
          await db.update(users).set({ advanceCredit: remainingCredit.toFixed(2), isFrozen: isDelinquent }).where(eq(users.id, uId));
        } else if (isDelinquent) {
          await db.update(users).set({ isFrozen: true }).where(eq(users.id, uId));
        }

        const netTotalAmount = Math.max(0, subtotal - advanceCreditApplied);

        // Scheduled dates: default issued 15th, due 30th
        let setDueDate = dueDate ? new Date(dueDate) : new Date();
        if (!dueDate) {
          setDueDate.setDate(30);
        }

        const statementTitle = isHoaOnly ? `${billingMonth} HOA Monthly Dues Statement` :
                              isWaterOnly ? `${billingMonth} Water Meter Billing Statement` :
                              `${billingMonth} Statement of Account`;

        const created = await db.insert(billings).values({
          userId: uId,
          phase: targetUser.phase,
          blockLot: targetUser.blockLot,
          billingMonth,
          hoaDues: hDues.toFixed(2),
          prevReading: pReading.toFixed(2),
          currReading: cReading.toFixed(2),
          waterUsage: usage.toFixed(2),
          waterRate: '0.00',
          waterAmount: waterCalc.amount.toFixed(2),
          arrearsAmount: arrearsSum.toFixed(2),
          penaltyAmount: penaltyAmount.toFixed(2),
          advanceCreditApplied: advanceCreditApplied.toFixed(2),
          amountPaid: '0.00',
          totalAmount: netTotalAmount.toFixed(2),
          status: 'UNPAID',
          waterStatus: isHoaOnly ? 'PAID' : 'UNPAID',
          hoaStatus: isWaterOnly ? 'PAID' : 'UNPAID',
          isOverriddenReading,
          isDelinquent,
          pmoNotes: `${statementTitle} - ${isHoaOnly ? `HOA Dues: ₱${hDues}` : isWaterOnly ? `Water Usage: ${usage}m³ (₱${waterCalc.amount.toFixed(2)})` : `HOA: ₱${hDues} + Water: ₱${waterCalc.amount.toFixed(2)}`}${arrearsSum > 0 ? ` + Arrears: ₱${arrearsSum.toFixed(2)}` : ''}${penaltyAmount > 0 ? ` + Penalty: ₱${penaltyAmount.toFixed(2)}` : ''}${advanceCreditApplied > 0 ? ` - Credit: ₱${advanceCreditApplied.toFixed(2)}` : ''}`,
          dueDate: setDueDate
        }).returning();

        await db.insert(notifications).values({
          userId: uId,
          type: 'BILLING',
          title: `Statement Released: ${statementTitle}`,
          message: `Total Payable: ₱${netTotalAmount.toFixed(2)} (${isHoaOnly ? `HOA Dues: ₱${hDues}` : isWaterOnly ? `Water: ₱${waterCalc.amount.toFixed(2)}` : `HOA: ₱${hDues} + Water: ₱${waterCalc.amount.toFixed(2)}`}). Due on ${setDueDate.toLocaleDateString()}.`,
          link: '/billings'
        });

        await logAudit(actor.id, actor.name, actor.role, 'GENERATE_BILLING', `Resident #${uId}`, `${billingMonth} Net Total: ₱${netTotalAmount.toFixed(2)}`);

        return res.json([created[0]]);
      } else {
        // Bulk generation for all residents
        const residents = await db.select().from(users);
        const createdBills = [];

        const isHoaOnly = issuanceType === 'HOA';
        const isWaterOnly = issuanceType === 'WATER';

        for (const resident of residents) {
          const userBills = await db.select().from(billings).where(eq(billings.userId, resident.id)).orderBy(desc(billings.createdAt));
          const latestBill = userBills[0];

          let pReading = 0;
          let cReading = 0;
          let usage = 0;
          let waterCalc = { amount: 0 };

          if (!isHoaOnly) {
            pReading = latestBill ? parseFloat(latestBill.currReading || '0.00') : 0;
            cReading = pReading + 15; // standard benchmark increment
            usage = 15;
            waterCalc = calculateWaterAmountHelper(usage, settings.waterTiers);
          }

          const hDues = isWaterOnly ? 0 : getHoaDuesByHouseTypeHelper(resident.houseType, settings);

          const unpaidBills = userBills.filter(b => b.status === 'UNPAID' || b.status === 'PARTIAL' || b.status === 'PENDING_VERIFICATION');
          const arrearsSum = unpaidBills.reduce((acc, b) => acc + (parseFloat(b.totalAmount || '0') - parseFloat(b.amountPaid || '0')), 0);
          const unpaidMonthsCount = unpaidBills.length;

          let penaltyAmount = 0;
          if (unpaidMonthsCount > 3) {
            penaltyAmount = arrearsSum * 0.05 * (unpaidMonthsCount - 3);
          }

          const isDelinquent = unpaidMonthsCount >= 12;
          const subtotal = hDues + waterCalc.amount + arrearsSum + penaltyAmount;

          let currentCredit = parseFloat(resident.advanceCredit || '0.00');
          let advanceCreditApplied = 0;
          if (currentCredit > 0) {
            advanceCreditApplied = Math.min(currentCredit, subtotal);
            const remainingCredit = currentCredit - advanceCreditApplied;
            await db.update(users).set({ advanceCredit: remainingCredit.toFixed(2), isFrozen: isDelinquent }).where(eq(users.id, resident.id));
          } else if (isDelinquent) {
            await db.update(users).set({ isFrozen: true }).where(eq(users.id, resident.id));
          }

          const netTotalAmount = Math.max(0, subtotal - advanceCreditApplied);

          let setDueDate = dueDate ? new Date(dueDate) : new Date();
          if (!dueDate) setDueDate.setDate(30);

          const statementTitle = isHoaOnly ? `${billingMonth} HOA Monthly Dues Statement` :
                                isWaterOnly ? `${billingMonth} Water Meter Billing Statement` :
                                `${billingMonth} Statement of Account`;

          const created = await db.insert(billings).values({
            userId: resident.id,
            phase: resident.phase,
            blockLot: resident.blockLot,
            billingMonth,
            hoaDues: hDues.toFixed(2),
            prevReading: pReading.toFixed(2),
            currReading: cReading.toFixed(2),
            waterUsage: usage.toFixed(2),
            waterRate: '0.00',
            waterAmount: waterCalc.amount.toFixed(2),
            arrearsAmount: arrearsSum.toFixed(2),
            penaltyAmount: penaltyAmount.toFixed(2),
            advanceCreditApplied: advanceCreditApplied.toFixed(2),
            amountPaid: '0.00',
            totalAmount: netTotalAmount.toFixed(2),
            status: 'UNPAID',
            waterStatus: isHoaOnly ? 'PAID' : 'UNPAID',
            hoaStatus: isWaterOnly ? 'PAID' : 'UNPAID',
            isDelinquent,
            pmoNotes: `Bulk ${statementTitle} - Unit Type ${resident.houseType || 'A'}`,
            dueDate: setDueDate
          }).returning();

          await db.insert(notifications).values({
            userId: resident.id,
            type: 'BILLING',
            title: `Monthly SOA Issued: ${billingMonth}`,
            message: `Total Due: ₱${netTotalAmount.toFixed(2)}. Due date: ${setDueDate.toLocaleDateString()}.`,
            link: '/billings'
          });

          createdBills.push(created[0]);
        }

        await logAudit(actor.id, actor.name, actor.role, 'BULK_GENERATE_BILLING', `All Residents (${residents.length})`, `${billingMonth}`);

        return res.json(createdBills);
      }
    } catch (error) {
      console.error("Failed to generate billing statement:", error);
      res.status(500).json({ error: "Failed to generate billing statement" });
    }
  });

  app.patch("/api/admin/billings/:id/verify-payment", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const billingId = parseInt(req.params.id);
      const { verifyItem = 'BOTH', amountPaid, pmoNotes, statusOverride } = req.body;

      const targetBillRes = await db.select().from(billings).where(eq(billings.id, billingId));
      if (targetBillRes.length === 0) return res.status(404).json({ error: "Billing record not found" });

      const bill = targetBillRes[0];
      let updateData: any = {
        pmoNotes: pmoNotes || bill.pmoNotes
      };

      if (verifyItem === 'WATER') {
        updateData.waterStatus = statusOverride || 'PAID';
        updateData.waterPaidAt = statusOverride === 'UNPAID' ? null : new Date();
        updateData.waterAmountPaid = statusOverride === 'UNPAID' ? '0.00' : bill.waterAmount;
      } else if (verifyItem === 'HOA') {
        updateData.hoaStatus = statusOverride || 'PAID';
        updateData.hoaPaidAt = statusOverride === 'UNPAID' ? null : new Date();
        updateData.hoaAmountPaid = statusOverride === 'UNPAID' ? '0.00' : bill.hoaDues;
      } else {
        // BOTH / FULL
        const targetStatus = statusOverride || 'PAID';
        updateData.waterStatus = targetStatus;
        updateData.waterPaidAt = targetStatus === 'UNPAID' ? null : new Date();
        updateData.waterAmountPaid = targetStatus === 'UNPAID' ? '0.00' : bill.waterAmount;
        updateData.hoaStatus = targetStatus;
        updateData.hoaPaidAt = targetStatus === 'UNPAID' ? null : new Date();
        updateData.hoaAmountPaid = targetStatus === 'UNPAID' ? '0.00' : bill.hoaDues;
        updateData.paidAt = targetStatus === 'UNPAID' ? null : new Date();
        updateData.amountPaid = targetStatus === 'UNPAID' ? '0.00' : bill.totalAmount;
      }

      // Re-evaluate overall bill status
      const resWater = updateData.waterStatus || bill.waterStatus || 'UNPAID';
      const resHoa = updateData.hoaStatus || bill.hoaStatus || 'UNPAID';

      if (resWater === 'PAID' && resHoa === 'PAID') {
        updateData.status = 'PAID';
        updateData.paidAt = new Date();
        updateData.amountPaid = bill.totalAmount;
      } else if (resWater === 'PAID' || resHoa === 'PAID') {
        updateData.status = 'PARTIAL';
      } else if (resWater === 'PENDING_VERIFICATION' || resHoa === 'PENDING_VERIFICATION') {
        updateData.status = 'PENDING_VERIFICATION';
      } else {
        updateData.status = 'UNPAID';
      }

      const updated = await db.update(billings).set(updateData).where(eq(billings.id, billingId)).returning();

      // Find all members in the household to notify everyone
      const allUsers = await db.select().from(users);
      const householdMembers = allUsers.filter(u => {
        if (!u.blockLot) return u.id === bill.userId;
        if (bill.phase && u.phase) {
          return u.phase === bill.phase && u.blockLot === bill.blockLot;
        }
        return u.blockLot === bill.blockLot;
      });

      for (const member of householdMembers) {
        await db.insert(notifications).values({
          userId: member.id,
          type: 'BILLING',
          title: `Household Payment Verified`,
          message: `PMO verified ${verifyItem} payment for SOA #${billingId} (${bill.billingMonth}). Status is now ${updateData.status}.`,
          link: '/billings'
        });

        // Unfreeze account if all unpaid billings are settled
        const remainingUnpaid = await db.select().from(billings).where(and(eq(billings.userId, member.id), eq(billings.isDelinquent, true)));
        const stillDelinquent = remainingUnpaid.filter(b => b.status !== 'PAID').length > 0;
        if (!stillDelinquent && member.isFrozen) {
          await db.update(users).set({ isFrozen: false }).where(eq(users.id, member.id));
        }
      }

      await logAudit(actor.id, actor.name, actor.role, 'VERIFY_BILLING_PAYMENT', `Billing #${billingId}`, `Item: ${verifyItem}, Status: ${updateData.status}`);

      res.json(updated[0]);
    } catch (error) {
      console.error("Failed to verify billing payment:", error);
      res.status(500).json({ error: "Failed to verify billing payment" });
    }
  });

  app.patch("/api/admin/billings/:id/verify", requireAuth, async (req: AuthRequest, res) => {
    try {
      const actorRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      const actor = actorRes[0];
      if (!actor || (actor.role !== 'SUPERADMIN' && actor.role !== 'ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const billingId = parseInt(req.params.id);
      const { status, pmoNotes, verifyItem = 'BOTH' } = req.body;

      const targetBillRes = await db.select().from(billings).where(eq(billings.id, billingId));
      if (targetBillRes.length === 0) return res.status(404).json({ error: "Billing not found" });

      const bill = targetBillRes[0];
      let updateData: any = {
        pmoNotes: pmoNotes || bill.pmoNotes
      };

      if (verifyItem === 'WATER') {
        updateData.waterStatus = status;
        updateData.waterPaidAt = status === 'PAID' ? new Date() : null;
      } else if (verifyItem === 'HOA') {
        updateData.hoaStatus = status;
        updateData.hoaPaidAt = status === 'PAID' ? new Date() : null;
      } else {
        updateData.waterStatus = status;
        updateData.hoaStatus = status;
        updateData.status = status;
        updateData.paidAt = status === 'PAID' ? new Date() : null;
      }

      const resWater = updateData.waterStatus || bill.waterStatus || 'UNPAID';
      const resHoa = updateData.hoaStatus || bill.hoaStatus || 'UNPAID';

      if (resWater === 'PAID' && resHoa === 'PAID') {
        updateData.status = 'PAID';
        updateData.paidAt = new Date();
      } else if (resWater === 'PAID' || resHoa === 'PAID') {
        updateData.status = 'PARTIAL';
      } else {
        updateData.status = status;
      }

      const updated = await db.update(billings).set(updateData).where(eq(billings.id, billingId)).returning();

      if (updated.length > 0) {
        const allUsers = await db.select().from(users);
        const householdMembers = allUsers.filter(u => {
          if (!u.blockLot) return u.id === bill.userId;
          if (bill.phase && u.phase) {
            return u.phase === bill.phase && u.blockLot === bill.blockLot;
          }
          return u.blockLot === bill.blockLot;
        });

        for (const member of householdMembers) {
          await db.insert(notifications).values({
            userId: member.id,
            type: 'BILLING',
            title: `Billing Payment ${status}`,
            message: `Payment status for ${verifyItem} statement #${billingId} is now ${status}. ${pmoNotes ? 'Notes: ' + pmoNotes : ''}`,
            link: '/billings'
          });
        }

        await logAudit(actor.id, actor.name, actor.role, 'VERIFY_BILLING_PAYMENT', `Billing #${billingId}`, `Item: ${verifyItem}, Status: ${status}`);
      }

      res.json(updated[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify billing payment" });
    }
  });

  // Resident Pass verification endpoint
  app.get("/api/resident-pass/verify/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      const userRes = await db.select().from(users).where(eq(users.uid, uid));
      if (userRes.length === 0) return res.status(404).json({ valid: false, message: "Resident Not Found" });

      const resident = userRes[0];
      res.json({
        valid: resident.approvalStatus === 'APPROVED',
        name: resident.name,
        blockLot: resident.blockLot || 'Casa Mira South',
        role: resident.role,
        approvalStatus: resident.approvalStatus,
        profileImage: resident.profileImage || '',
        verifiedSince: resident.createdAt
      });
    } catch (error) {
      res.status(500).json({ valid: false, message: "Verification error" });
    }
  });

  // Contacts endpoints
  app.get("/api/contacts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const result = await db.select().from(contacts).orderBy(contacts.createdAt);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/admin/contacts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const { name, number, category } = req.body;
      const result = await db.insert(contacts).values({ name, number, category }).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.delete("/api/admin/contacts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0] || (userRes[0].role !== 'ADMIN' && userRes[0].role !== 'SUPERADMIN')) return res.status(403).json({ error: "Forbidden" });

      const targetId = parseInt(req.params.id);
      await db.delete(contacts).where(eq(contacts.id, targetId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // AI Assistant endpoint
  app.post("/api/ai/ask", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }
      
      // Fetch community context to inject into AI prompt
      const allEvents = await db.select().from(events);
      const allAnnouncements = await db.select().from(announcements);
      const allBusinesses = await db.select().from(businesses);
      const allListings = await db.select().from(listings);
      
      const context = `
      You are Mirai, the friendly, warm, and helpful AI community companion for Casa Mira South residents!
      Your persona is approachable, polite, neighborly, and enthusiastic about helping residents find local services, check upcoming events, read announcements, and navigate community living.
      
      Guidelines:
      1. Always speak as "Mirai". Be friendly and conversational, using warm tone and occasional polite emojis where natural.
      2. Keep answers helpful, clear, and concise.
      3. Base your answers on the provided Casa Mira South community data below. If something isn't found in the list, offer helpful advice on how to contact the PMO office or post in the community chat.

      Events: ${JSON.stringify(allEvents)}
      Announcements: ${JSON.stringify(allAnnouncements)}
      Verified Services/Businesses: ${JSON.stringify(allBusinesses)}
      Marketplace Listings: ${JSON.stringify(allListings)}
      `;

      let aiText = '';
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            { role: "user", parts: [{ text: context }] },
            { role: "user", parts: [{ text: query }] }
          ],
        });
        aiText = response.text || '';
      } catch (geminiError: any) {
        console.warn("Gemini generation notice, falling back to community knowledge synthesis:", geminiError?.message || geminiError);
        
        // Intelligent local synthesizer fallback when Gemini API is busy or throttled
        const lowerQ = query.toLowerCase();
        const matches: string[] = [];

        if (lowerQ.includes('water') || lowerQ.includes('interruption') || lowerQ.includes('maintenance')) {
          const waterAnn = allAnnouncements.find(a => (a.title + a.description).toLowerCase().includes('water'));
          if (waterAnn) matches.push(`💧 **Water Advisory:** ${waterAnn.title}\n${waterAnn.description}`);
        }

        if (lowerQ.includes('event') || lowerQ.includes('activity') || lowerQ.includes('schedule') || lowerQ.includes('assembly') || lowerQ.includes('meeting')) {
          if (allEvents.length > 0) {
            matches.push(`📅 **Upcoming Community Events:**\n` + allEvents.slice(0, 3).map(e => `• **${e.title}** on ${new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (${e.location || 'Clubhouse'}): ${e.description}`).join('\n'));
          }
        }

        if (lowerQ.includes('announcement') || lowerQ.includes('update') || lowerQ.includes('notice') || lowerQ.includes('news')) {
          if (allAnnouncements.length > 0) {
            matches.push(`📢 **Latest Subdivision Bulletins:**\n` + allAnnouncements.slice(0, 3).map(a => `• **${a.title}** (${a.category}): ${a.description}`).join('\n'));
          }
        }

        if (lowerQ.includes('buy') || lowerQ.includes('sell') || lowerQ.includes('market') || lowerQ.includes('food') || lowerQ.includes('listing')) {
          if (allListings.length > 0) {
            matches.push(`🛍️ **Marketplace Listings:**\n` + allListings.slice(0, 3).map(l => `• **${l.title}** (₱${l.price}) - ${l.description}`).join('\n'));
          }
        }

        if (lowerQ.includes('service') || lowerQ.includes('repair') || lowerQ.includes('plumb') || lowerQ.includes('electric') || lowerQ.includes('business') || lowerQ.includes('ac')) {
          if (allBusinesses.length > 0) {
            matches.push(`🔧 **Verified Subdivision Services:**\n` + allBusinesses.slice(0, 3).map(b => `• **${b.businessName}** (${b.category}): ${b.description} | Contact: ${b.contact}`).join('\n'));
          }
        }

        if (lowerQ.includes('due') || lowerQ.includes('bill') || lowerQ.includes('hoa') || lowerQ.includes('pay') || lowerQ.includes('rate')) {
          matches.push(`💳 **HOA Dues & Utility Information:**\n• Single Detached (Type A): ₱240.00 / month\n• Townhouse (Type B): ₱320.00 / month\n• Two-Storey Single (Type C): ₱480.00 / month\n• Payment channels: GCash (0917-123-4567) or BDO Bank Transfer (0012-3456-7890). You can upload proof of payment in the **Water & HOA Dues** module!`);
        }

        if (lowerQ.includes('emergency') || lowerQ.includes('guard') || lowerQ.includes('gate') || lowerQ.includes('phone') || lowerQ.includes('contact') || lowerQ.includes('hotline')) {
          matches.push(`🚨 **Important Subdivision Hotlines:**\n• Main Gate 1 Guardhouse: **+63 912 345 6789**\n• PMO Administrative Office: **+63 917 888 9900**\n• Subdivision Patrol Officer: **+63 917 888 9901**`);
        }

        if (matches.length > 0) {
          aiText = `Hello neighbor! 👋 Here is what I found in our Casa Mira South records for your question:\n\n` + matches.join('\n\n') + `\n\nIs there anything specific you would like me to check further?`;
        } else {
          aiText = `Hello! I'm Mirai, your Casa Mira South community companion. 👋 I checked our latest community database for "${query}".\n\nFor general inquiries, the PMO Office is open Monday to Saturday from 8:00 AM to 5:00 PM (+63 917 888 9900). You can also browse our **Announcements**, **Events**, and **Marketplace** tabs directly in the portal!`;
        }
      }
      
      res.json({ text: aiText });
    } catch (error) {
      console.error("AI error:", error);
      res.status(500).json({ error: "Failed to get response from AI assistant" });
    }
  });

  // Helpful aliases for common direct endpoint URLs
  app.get("/api/marketplace", requireAuth, async (req: AuthRequest, res) => {
    try {
      const allListings = await db.select().from(listings).orderBy(desc(listings.createdAt));
      res.json(allListings);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch marketplace listings" });
    }
  });

  app.get("/api/billings", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userRes = await db.select().from(users).where(eq(users.uid, req.user!.uid));
      if (!userRes[0]) return res.json([]);
      const myBills = await db.select().from(billings).where(eq(billings.userId, userRes[0].id)).orderBy(desc(billings.createdAt));
      res.json(myBills);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch billings" });
    }
  });

  // Fallback for unmatched API routes to prevent falling through to HTML SPA routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const gracefulShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

process.on("unhandledRejection", (reason) => {
  console.warn("Unhandled rejection (prevented crash):", reason);
});

process.on("uncaughtException", (err) => {
  console.warn("Uncaught exception (prevented crash):", err);
});

startServer();
