import { db } from './index.ts';
import { users, announcements, events, listings, businesses, contacts, billings, memoryVault, reports, gateScans, pets, utilitySettings } from './schema.ts';
import { sql } from 'drizzle-orm';

export async function seedInitialData() {
  try {
    // Ensure all DB columns exist
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS badges text DEFAULT '[]';`);
    } catch (migErr) {
      console.warn('Migration error adding badges column:', migErr);
    }

    // 0. Seed Utility Settings if empty
    const existingSettings = await db.select().from(utilitySettings);
    if (existingSettings.length === 0) {
      await db.insert(utilitySettings).values({
        waterTiers: JSON.stringify([
          { id: 1, min: 0, max: 10, isFlatMin: true, minRate: 180, ratePerCuM: 0, label: '0-10 cu.m Minimum' },
          { id: 2, min: 11, max: 20, isFlatMin: false, minRate: 0, ratePerCuM: 22, label: '11-20 cu.m Bracket' },
          { id: 3, min: 21, max: 30, isFlatMin: false, minRate: 0, ratePerCuM: 26, label: '21-30 cu.m Bracket' },
          { id: 4, min: 31, max: 999, isFlatMin: false, minRate: 0, ratePerCuM: 32, label: '31+ cu.m Excess' }
        ]),
        phases: JSON.stringify(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 3A', 'Phase 3B', 'Phase 3A.2']),
        hoaDuesTypeA: '240.00',
        hoaDuesTypeB: '320.00',
        hoaDuesTypeC: '480.00',
        gcashNumber: '0917-123-4567',
        bdoAccount: '0012-3456-7890',
        accountName: 'Casa Mira South HOA'
      });
      console.log('Default utility settings initialized.');
    }

    const existingUsers = await db.select().from(users);
    if (existingUsers.length < 20) {
      console.log('Seeding comprehensive 20+ sample users & 5+ feature entries...');

    // 1. Seed 20+ Homeowners & Staff Users with various roles
    const sampleUsers = [
      {
        uid: 'pmo-superadmin-uid',
        email: 'pmo@casamirasouth.com',
        username: 'P1B1L01',
        password: 'CM9900',
        tempAccessPin: 'CM9900',
        phase: 'Phase 1',
        name: 'Engr. Carlos Mendoza (PMO Head)',
        role: 'SUPERADMIN',
        blockLot: 'Phase 1 Block 1 Lot 1',
        phoneNumber: '+63 917 888 9900',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'pmo-staff-demo-uid',
        email: 'pmo.staff@casamirasouth.com',
        username: 'PMO_STAFF',
        password: 'CM9901',
        tempAccessPin: 'CM9901',
        phase: 'Phase 1',
        name: 'Officer Miguel Tan (PMO Staff)',
        role: 'PMO',
        blockLot: 'Phase 1 Block 1 Lot 2 (PMO Office)',
        phoneNumber: '+63 917 888 9901',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'hoa-bod-demo-uid',
        email: 'bod.ramon@casamirasouth.com',
        username: 'HOA_BOD_1',
        password: 'CM9902',
        tempAccessPin: 'CM9902',
        phase: 'Phase 1',
        name: 'Director Ramon Villamor (HOA-BOD)',
        role: 'HOA-BOD',
        blockLot: 'Phase 1 Block 2 Lot 5',
        phoneNumber: '+63 917 888 9902',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p3a2b15l21-uid',
        email: 'maria.santos@gmail.com',
        username: 'P3A2B15L21',
        password: 'CM3A21',
        tempAccessPin: 'CM3A21',
        phase: 'Phase 3',
        name: 'Maria Clara Santos',
        role: 'RESIDENT',
        blockLot: 'Phase 3 Sector A2 Block 15 Lot 21',
        phoneNumber: '+63 918 234 5678',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b4l12-uid',
        email: 'juan.delacruz@gmail.com',
        username: 'P1B4L12',
        password: 'CM1B42',
        tempAccessPin: 'CM1B42',
        phase: 'Phase 1',
        name: 'Juan Dela Cruz',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 4 Lot 12',
        phoneNumber: '+63 919 345 6789',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p2b8l05-uid',
        email: 'robert.dalisay@gmail.com',
        username: 'P2B8L05',
        password: 'CM2B85',
        tempAccessPin: 'CM2B85',
        phase: 'Phase 2',
        name: 'Capt. Robert Dalisay',
        role: 'EVENT_ORGANIZER',
        blockLot: 'Phase 2 Block 8 Lot 5',
        phoneNumber: '+63 920 456 7890',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b2l08-uid',
        email: 'evelyn.tan@gmail.com',
        username: 'P1B2L08',
        password: 'CM1B28',
        tempAccessPin: 'CM1B28',
        phase: 'Phase 1',
        name: 'Dr. Evelyn Tan',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 2 Lot 8',
        phoneNumber: '+63 921 567 8901',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p3b12l04-uid',
        email: 'marco.v@gmail.com',
        username: 'P3B12L04',
        password: 'CM3B12',
        tempAccessPin: 'CM3B12',
        phase: 'Phase 3',
        name: 'Arch. Marco Valenzuela',
        role: 'SERVICE_PROVIDER',
        blockLot: 'Phase 3 Block 12 Lot 4',
        phoneNumber: '+63 922 678 9012',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p2b15l19-uid',
        email: 'ana.roxas@gmail.com',
        username: 'P2B15L19',
        password: 'CM2B15',
        tempAccessPin: 'CM2B15',
        phase: 'Phase 2',
        name: 'Ana Patricia Roxas',
        role: 'ADMIN',
        blockLot: 'Phase 2 Block 15 Lot 19',
        phoneNumber: '+63 923 789 0123',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b5l03-uid',
        email: 'benjamin.cruz@gmail.com',
        username: 'P1B5L03',
        password: 'CM1B53',
        tempAccessPin: 'CM1B53',
        phase: 'Phase 1',
        name: 'Benjamin Cruz',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 5 Lot 3',
        phoneNumber: '+63 924 890 1234',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p2b3l14-uid',
        email: 'carla.gomez@gmail.com',
        username: 'P2B3L14',
        password: 'CM2B34',
        tempAccessPin: 'CM2B34',
        phase: 'Phase 2',
        name: 'Carla Gomez',
        role: 'SERVICE_PROVIDER',
        blockLot: 'Phase 2 Block 3 Lot 14',
        phoneNumber: '+63 925 901 2345',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p3b8l22-uid',
        email: 'diego.reyes@gmail.com',
        username: 'P3B8L22',
        password: 'CM3B82',
        tempAccessPin: 'CM3B82',
        phase: 'Phase 3',
        name: 'Diego Reyes',
        role: 'EVENT_ORGANIZER',
        blockLot: 'Phase 3 Block 8 Lot 22',
        phoneNumber: '+63 926 012 3456',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b9l10-uid',
        email: 'elena.navarro@gmail.com',
        username: 'P1B9L10',
        password: 'CM1B90',
        tempAccessPin: 'CM1B90',
        phase: 'Phase 1',
        name: 'Elena Navarro',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 9 Lot 10',
        phoneNumber: '+63 927 123 4567',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p2b11l07-uid',
        email: 'fernando.soriano@gmail.com',
        username: 'P2B11L07',
        password: 'CM2B17',
        tempAccessPin: 'CM2B17',
        phase: 'Phase 2',
        name: 'Fernando Soriano',
        role: 'RESIDENT',
        blockLot: 'Phase 2 Block 11 Lot 7',
        phoneNumber: '+63 928 234 5678',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p3b4l18-uid',
        email: 'grace.aquino@gmail.com',
        username: 'P3B4L18',
        password: 'CM3B48',
        tempAccessPin: 'CM3B48',
        phase: 'Phase 3',
        name: 'Grace Aquino',
        role: 'RESIDENT',
        blockLot: 'Phase 3 Block 4 Lot 18',
        phoneNumber: '+63 929 345 6789',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b7l25-uid',
        email: 'hector.villa@gmail.com',
        username: 'P1B7L25',
        password: 'CM1B75',
        tempAccessPin: 'CM1B75',
        phase: 'Phase 1',
        name: 'Hector Villamor',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 7 Lot 25',
        phoneNumber: '+63 930 456 7890',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p2b6l02-uid',
        email: 'isabel.castro@gmail.com',
        username: 'P2B6L02',
        password: 'CM2B62',
        tempAccessPin: 'CM2B62',
        phase: 'Phase 2',
        name: 'Isabel Castro',
        role: 'RESIDENT',
        blockLot: 'Phase 2 Block 6 Lot 2',
        phoneNumber: '+63 931 567 8901',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p3b10l15-uid',
        email: 'joaquin.lopez@gmail.com',
        username: 'P3B10L15',
        password: 'CM3B15',
        tempAccessPin: 'CM3B15',
        phase: 'Phase 3',
        name: 'Joaquin Lopez',
        role: 'SERVICE_PROVIDER',
        blockLot: 'Phase 3 Block 10 Lot 15',
        phoneNumber: '+63 932 678 9012',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b12l06-uid',
        email: 'katrina.mercado@gmail.com',
        username: 'P1B12L06',
        password: 'CM1B16',
        tempAccessPin: 'CM1B16',
        phase: 'Phase 1',
        name: 'Katrina Mercado',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 12 Lot 6',
        phoneNumber: '+63 933 789 0123',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p2b14l11-uid',
        email: 'lorenzo.perez@gmail.com',
        username: 'P2B14L11',
        password: 'CM2B11',
        tempAccessPin: 'CM2B11',
        phase: 'Phase 2',
        name: 'Lorenzo Perez',
        role: 'RESIDENT',
        blockLot: 'Phase 2 Block 14 Lot 11',
        phoneNumber: '+63 934 890 1234',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p3b5l20-uid',
        email: 'monica.torres@gmail.com',
        username: 'P3B5L20',
        password: 'CM3B50',
        tempAccessPin: 'CM3B50',
        phase: 'Phase 3',
        name: 'Monica Torres',
        role: 'RESIDENT',
        blockLot: 'Phase 3 Block 5 Lot 20',
        phoneNumber: '+63 935 901 2345',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80'
      },
      {
        uid: 'user-p1b8l16-uid',
        email: 'nicolas.silva@gmail.com',
        username: 'P1B8L16',
        password: 'CM1B86',
        tempAccessPin: 'CM1B86',
        phase: 'Phase 1',
        name: 'Nicolas Silva',
        role: 'RESIDENT',
        blockLot: 'Phase 1 Block 8 Lot 16',
        phoneNumber: '+63 936 012 3456',
        approvalStatus: 'APPROVED',
        profileImage: 'https://images.unsplash.com/photo-1480429370139-e0132c086e2a?auto=format&fit=crop&w=400&q=80'
      }
    ];

    const seededUsers = await db.insert(users).values(sampleUsers).onConflictDoNothing().returning();
    const adminUser = seededUsers[0] || (await db.select().from(users).limit(1))[0];
    const resident1 = seededUsers[1] || adminUser;

    // 2. Seed Emergency Hotlines & Directory (8 entries)
    await db.insert(contacts).values([
      { name: 'Gate 1 Main Guard House', number: '+63 912 345 6789', category: 'EMERGENCY' },
      { name: 'Gate 2 Security Command', number: '+63 912 345 6790', category: 'EMERGENCY' },
      { name: 'Casa Mira PMO Admin Office', number: '+63 917 888 9900', category: 'ADMIN' },
      { name: 'Casa Mira Medical Clinic', number: '+63 918 111 2233', category: 'HEALTH' },
      { name: 'City Fire Station Dispatch', number: '911 / +63 920 333 4455', category: 'EMERGENCY' },
      { name: 'PNP Police Precinct', number: '117 / +63 922 555 6677', category: 'EMERGENCY' },
      { name: 'Ambulance & Disaster Rescue', number: '+63 925 777 8899', category: 'EMERGENCY' },
      { name: 'Electric & Water Utility Desk', number: '+63 930 999 0011', category: 'UTILITIES' }
    ]);

    // 3. Seed 5 Announcements
    await db.insert(announcements).values([
      {
        title: 'PMO Scheduled Water Interruption & Pipeline Maintenance',
        description: 'Notice to all residents: Essential water line upgrades will occur on Friday from 10:00 PM to 4:00 AM. Please store adequate water for household consumption.',
        category: 'Maintenance',
        priority: 'HIGH',
        status: 'APPROVED',
        createdDate: new Date()
      },
      {
        title: 'Annual HOA General Assembly & Board Election',
        description: 'Join us this Sunday at 2:00 PM at the Grand Clubhouse. Quorum required for voting on community improvements, CCTV upgrades, and swimming pool guidelines.',
        category: 'Community',
        priority: 'HIGH',
        status: 'APPROVED',
        createdDate: new Date(Date.now() - 86400000)
      },
      {
        title: 'RFID Gate Tag Registration & Migration Notice',
        description: 'All vehicle owners are requested to claim their new encrypted RFID stickers at the PMO Office from Monday to Saturday, 8am-5pm. Bring 1 valid ID and OR/CR.',
        category: 'Security',
        priority: 'NORMAL',
        status: 'APPROVED',
        createdDate: new Date(Date.now() - 172800000)
      },
      {
        title: 'Subdivision Garbage Collection Schedule Update',
        description: 'Biodegradable waste will be collected on Monday/Wednesday/Friday. Recyclables and dry waste on Tuesday/Thursday/Saturday. Please segregate properly.',
        category: 'Maintenance',
        priority: 'NORMAL',
        status: 'APPROVED',
        createdDate: new Date(Date.now() - 259200000)
      },
      {
        title: 'Grand Clubhouse Infinity Pool Cleaning & Sanitation Routine',
        description: 'The Phase 1 main infinity pool will undergo chemical treatment and deep vacuuming every Monday morning from 6am to 12pm. Pool reopens at 1:00 PM.',
        category: 'Amenities',
        priority: 'NORMAL',
        status: 'APPROVED',
        createdDate: new Date(Date.now() - 345600000)
      }
    ]);

    // 4. Seed 5 Events (with Graphic Hero Images)
    await db.insert(events).values([
      {
        title: 'Casa Mira Cup 2026 Basketball League Finals',
        description: 'Championship game between Phase 1 Strikers and Phase 2 Warriors at the Covered Basketball Court! Refreshments and raffle prizes await!',
        date: new Date(Date.now() + 86400000 * 3),
        location: 'Covered Basketball Court',
        image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
        organizerId: adminUser.id,
        organizerName: 'Capt. Robert Dalisay',
        status: 'APPROVED'
      },
      {
        title: 'Sunday Holy Mass & Fellowship Breakfast',
        description: 'Celebrate Holy Mass with the community at Our Lady of Mt. Carmel Chapel followed by hot coffee and fresh pastries prepared by local resident vendors.',
        date: new Date(Date.now() + 86400000 * 2),
        location: 'Our Lady of Mt. Carmel Chapel',
        image: 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=800&q=80',
        organizerId: resident1.id,
        organizerName: 'Maria Clara Santos',
        status: 'APPROVED'
      },
      {
        title: 'Weekend Organic Farmers Market & Craft Fair',
        description: 'Support neighbor-owned businesses! Fresh fruits, vegetables, artisan baked breads, indoor plants, and hand-crafted accessories.',
        date: new Date(Date.now() + 86400000 * 5),
        location: 'Casa Mira Town Center Plaza',
        image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
        organizerId: adminUser.id,
        organizerName: 'Juan Dela Cruz',
        status: 'APPROVED'
      },
      {
        title: 'Youth Badminton & Pickleball Tournament',
        description: 'Friendly competitive tournament for teens and adults. Trophies, medals, and sports hydration vouchers provided.',
        date: new Date(Date.now() + 86400000 * 8),
        location: 'Phase 2 Sports Court Annex',
        image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
        organizerId: adminUser.id,
        organizerName: 'Diego Reyes',
        status: 'APPROVED'
      },
      {
        title: 'Neighborhood Zumba & Fitness Sunset Jam',
        description: 'Join licensed Zumba instructor Resident Carla for an energetic 1-hour sunset dance workout at the Linear Park pavilion.',
        date: new Date(Date.now() + 86400000 * 10),
        location: 'Phase 1 Linear Park Open Grounds',
        image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
        organizerId: adminUser.id,
        organizerName: 'Carla Gomez',
        status: 'APPROVED'
      }
    ]);

    // 5. Seed 5 Marketplace Listings
    await db.insert(listings).values([
      {
        sellerId: resident1.id,
        title: 'Freshly Baked Cheese Ensaymada (Box of 6)',
        description: 'Authentic butter ensaymada topped with rich grated queso de bola. Baked fresh daily in Phase 3!',
        price: '280.00',
        category: 'Food & Bakery',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        status: 'APPROVED',
        featured: true
      },
      {
        sellerId: adminUser.id,
        title: 'Inverter Aircon Cleaning & Sanitization Service',
        description: 'Professional deep clean for split type & window type units. Free freon check and antibac spray. Fast same-day service within Casa Mira.',
        price: '750.00',
        category: 'Services',
        image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        status: 'APPROVED',
        featured: true
      },
      {
        sellerId: resident1.id,
        title: 'Potted Monstera Deliciosa & Indoor Plant Collection',
        description: 'Healthy fenestrated Monstera plants in white ceramic pots with organic soil mix. Perfect home décor for living rooms.',
        price: '450.00',
        category: 'Plants & Garden',
        image: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=800&q=80',
        status: 'APPROVED',
        featured: false
      },
      {
        sellerId: resident1.id,
        title: 'Handmade Scented Soy Candles (Lavender & Vanilla)',
        description: 'Eco-friendly 100% natural soy wax candles infused with essential oils. Calming scent for relaxation and spa nights.',
        price: '320.00',
        category: 'Home & Crafts',
        image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80',
        status: 'APPROVED',
        featured: false
      },
      {
        sellerId: adminUser.id,
        title: 'Custom Architectural 3D House Plan Consultation',
        description: 'Free site visit and 3D architectural layout proposal for home extensions, interior redesign, or patio builds in Casa Mira South.',
        price: '1500.00',
        category: 'Professional Services',
        image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        status: 'APPROVED',
        featured: true
      }
    ]);

    // 6. Seed 5 Directory Businesses
    await db.insert(businesses).values([
      {
        ownerId: resident1.id,
        businessName: 'Mira Pure Water Refilling Hub',
        category: 'Water Station',
        description: 'Alkaline and Mineral water delivery directly to your home doorstep. Free bottle check and sanitization.',
        contact: '+63 918 234 5678',
        location: 'Commercial Town Center #04',
        verified: true,
        featured: true
      },
      {
        ownerId: adminUser.id,
        businessName: 'Casa Mira Laundry Express',
        category: 'Laundry & Dry Clean',
        description: 'Wash, dry, and fold service. Free pickup and door-to-door delivery for residents of Phase 1, 2, and 3.',
        contact: '+63 919 345 6789',
        location: 'Commercial Town Center #02',
        verified: true,
        featured: true
      },
      {
        ownerId: resident1.id,
        businessName: 'Patty & Brew Coffee Garage',
        category: 'Cafe & Bistro',
        description: 'Specialty espresso, iced matcha lattes, and gourmet grilled burgers served fresh at Phase 2 Town Center.',
        contact: '+63 925 901 2345',
        location: 'Commercial Town Center #08',
        verified: true,
        featured: true
      },
      {
        ownerId: adminUser.id,
        businessName: 'Sparkle Auto Detail & Bike Wash',
        category: 'Automotive',
        description: 'Premium ceramic coating, interior vacuuming, and pressure wash for cars, motorcycles, and SUVs.',
        contact: '+63 932 678 9012',
        location: 'Commercial Town Center #10',
        verified: true,
        featured: false
      },
      {
        ownerId: resident1.id,
        businessName: 'Little Angels Daycare & Learning Nook',
        category: 'Education & Childcare',
        description: 'Safe early childhood learning center with certified teachers, arts & crafts, and after-school tutoring.',
        contact: '+63 929 345 6789',
        location: 'Phase 1 Sector B Clubhouse Lounge',
        verified: true,
        featured: false
      }
    ]);

    // 7. Seed 5 Reports
    await db.insert(reports).values([
      {
        userId: resident1.id,
        category: 'Maintenance',
        description: 'Defective Streetlight Lamp near Phase 3 Block 15 Corner. The LED streetlight at Block 15 corner post flickering on and off.',
        location: 'Phase 3 Block 15 Corner',
        status: 'IN_PROGRESS'
      },
      {
        userId: adminUser.id,
        category: 'Security',
        description: 'Unattended Loose Pet Dog without Leash near Linear Park. Medium-sized Golden Retriever seen wandering near playground without owner leash.',
        location: 'Phase 1 Linear Park Playground',
        status: 'RESOLVED'
      },
      {
        userId: resident1.id,
        category: 'Utilities',
        description: 'Water Pressure Drop during Peak Morning Hours. Water pressure in Phase 2 Sector A slightly lower than standard pressure around 7:00 AM.',
        location: 'Phase 2 Sector A',
        status: 'PENDING'
      },
      {
        userId: adminUser.id,
        category: 'Safety',
        description: 'Overhanging Tree Branches touching Electrical Wire. Acacia tree branches extending near electric utility pole along Phase 1 main road.',
        location: 'Phase 1 Main Avenue',
        status: 'RESOLVED'
      },
      {
        userId: resident1.id,
        category: 'Security',
        description: 'Speeding Delivery Motorcycle along Residential Lane. Exceeding 20 kph speed limit inside subdivision. PMO guard house advised.',
        location: 'Phase 3 Sector A2 Avenue',
        status: 'RESOLVED'
      }
    ]);

    // 8. Seed 5 Memory Vault (with Photo Albums & Slides array)
    await db.insert(memoryVault).values([
      {
        title: 'Casa Mira South Grand Opening & Groundbreaking Ceremony',
        story: 'The historic day when Casa Mira South welcomed its very first homeowner families to Phase 1. A celebration of unity, prosperity, and modern living.',
        image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80'
        ]),
        date: new Date('2021-03-15'),
        status: 'APPROVED'
      },
      {
        title: 'Chapel Dedication & First Thanksgiving Holy Mass',
        story: 'Concelebrated Holy Mass at Our Lady of Mt. Carmel Chapel with community choir performances and neighborhood feast.',
        image: 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=800&q=80',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80'
        ]),
        date: new Date('2022-12-08'),
        status: 'APPROVED'
      },
      {
        title: 'Grand Clubhouse Swimming Pool & Pavilion Unveiling',
        story: 'Residents enjoying the infinity pool, lounge deck, and function hall inauguration with live acoustic band performance.',
        image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'
        ]),
        date: new Date('2023-05-20'),
        status: 'APPROVED'
      },
      {
        title: 'Christmas Lighting Festival & Carols by Candlelight',
        story: 'Annual Christmas tree lighting ceremony with fireworks display, choir carols, and gift distribution for neighborhood children.',
        image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=800&q=80'
        ]),
        date: new Date('2024-12-15'),
        status: 'APPROVED'
      },
      {
        title: 'Summer Inter-Phase Basketball League Finals & Awarding',
        story: 'Thrilling inter-phase sports tournament celebrating youth athletic achievements, sportsmanship, and community pride.',
        image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
        images: JSON.stringify([
          'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'
        ]),
        date: new Date('2025-05-10'),
        status: 'APPROVED'
      }
    ]);
    }

    // 6. Seed Billings if empty
    const existingBillings = await db.select().from(billings);
    if (existingBillings.length === 0) {
      const allUsers = await db.select().from(users);
      const residents = allUsers.filter(u => u.role === 'RESIDENT');
      for (const res of residents.slice(0, 5)) {
        await db.insert(billings).values([
          {
            userId: res.id,
            phase: res.phase || 'Phase 3',
            blockLot: res.blockLot || 'Phase 3 Sector A2 Block 15 Lot 21',
            billingMonth: 'September 2026',
            hoaDues: '240.00',
            prevReading: '124.00',
            currReading: '139.00',
            waterUsage: '15.00',
            waterRate: '22.00',
            waterAmount: '330.00',
            arrearsAmount: '0.00',
            penaltyAmount: '0.00',
            advanceCreditApplied: '0.00',
            amountPaid: '0.00',
            totalAmount: '570.00',
            status: 'UNPAID',
            waterStatus: 'UNPAID',
            hoaStatus: 'UNPAID',
            dueDate: new Date('2026-10-15'),
            createdAt: new Date('2026-09-01')
          },
          {
            userId: res.id,
            phase: res.phase || 'Phase 3',
            blockLot: res.blockLot || 'Phase 3 Sector A2 Block 15 Lot 21',
            billingMonth: 'August 2026',
            hoaDues: '240.00',
            prevReading: '110.00',
            currReading: '124.00',
            waterUsage: '14.00',
            waterRate: '22.00',
            waterAmount: '308.00',
            arrearsAmount: '0.00',
            penaltyAmount: '0.00',
            advanceCreditApplied: '0.00',
            amountPaid: '548.00',
            totalAmount: '548.00',
            status: 'PAID',
            waterStatus: 'PAID',
            hoaStatus: 'PAID',
            paidAt: new Date('2026-08-12'),
            dueDate: new Date('2026-08-20'),
            paymentRef: 'GCASH-9823419082',
            createdAt: new Date('2026-08-01')
          }
        ]);
      }
      console.log('Sample billings populated.');
    }

    // 7. Seed Pets if empty
    const existingPets = await db.select().from(pets);
    if (existingPets.length === 0) {
      const allUsers = await db.select().from(users);
      const resident = allUsers.find(u => u.username === 'P3A2B15L21') || allUsers.find(u => u.role === 'RESIDENT') || allUsers[0];
      if (resident) {
        await db.insert(pets).values([
          {
            ownerId: resident.id,
            ownerName: resident.name,
            blockLot: resident.blockLot || 'Phase 3 Sector A2 Block 15 Lot 21',
            phase: resident.phase || 'Phase 3',
            petName: 'Max',
            species: 'Dog',
            breed: 'Golden Retriever',
            color: 'Golden Cream',
            age: '2 yrs',
            rabiesVaccinated: true,
            vaccineDate: '2026-03-15',
            tagNumber: 'CMS-PET-0142',
            photo: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80',
            notes: 'Friendly, microchipped, PMO registered collar',
            status: 'APPROVED'
          },
          {
            ownerId: resident.id,
            ownerName: resident.name,
            blockLot: resident.blockLot || 'Phase 3 Sector A2 Block 15 Lot 21',
            phase: resident.phase || 'Phase 3',
            petName: 'Luna',
            species: 'Cat',
            breed: 'Persian Longhair',
            color: 'White',
            age: '1 yr',
            rabiesVaccinated: true,
            vaccineDate: '2026-04-10',
            tagNumber: 'CMS-PET-0143',
            photo: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80',
            notes: 'Indoor cat, fully vaccinated',
            status: 'APPROVED'
          }
        ]);
      }
      console.log('Sample pets populated.');
    }

    console.log('Casa Mira South system data seeded successfully!');
  } catch (error) {
    console.error('Failed to seed initial data:', error);
  }
}
