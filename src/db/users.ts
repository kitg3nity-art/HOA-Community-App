import { db, ensureDatabaseSchema } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email?: string, name?: string, profileImage?: string) {
  await ensureDatabaseSchema();
  const existing = await db.select().from(users).where(eq(users.uid, uid));
  if (existing.length > 0) {
    const user = existing[0];
    const now = new Date();
    const lastActive = user.lastLoginAt ? new Date(user.lastLoginAt) : new Date(user.createdAt || now);
    const daysInactive = (now.getTime() - lastActive.getTime()) / (1000 * 3600 * 24);

    let shouldFreeze = user.isFrozen;
    if (daysInactive > 730 && user.role === 'RESIDENT') {
      shouldFreeze = true;
    }

    await db.update(users).set({
      lastLoginAt: now,
      isFrozen: shouldFreeze
    }).where(eq(users.id, user.id));

    return { ...user, lastLoginAt: now, isFrozen: shouldFreeze };
  }

  const isHO = uid.startsWith('ho-') || uid.startsWith('P3') || uid.startsWith('P2') || uid.startsWith('P1');
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '');
  const userEmail = email || `${cleanUid.toLowerCase()}@casamirasouth.com`;
  const userName = name || (isHO ? `Resident ${uid.replace('ho-', '').toUpperCase()}` : `Resident ${cleanUid.slice(0, 8)}`);

  const result = await db.insert(users)
    .values({
      uid,
      email: userEmail,
      name: userName,
      profileImage: profileImage || '',
      role: (uid.includes('admin') || uid.includes('super')) ? 'SUPERADMIN' : 'RESIDENT',
      approvalStatus: (uid.includes('admin') || uid.includes('super')) ? 'APPROVED' : 'PENDING',
      createdAt: new Date()
    })
    .onConflictDoNothing()
    .returning();

  if (result.length > 0) return result[0];

  const reselect = await db.select().from(users).where(eq(users.uid, uid));
  return reselect[0];
}
