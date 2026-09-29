import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  username: text('username'), // e.g. P3A2B15L21, P1B4L12
  password: text('password'), // Access PIN/Password
  tempAccessPin: text('temp_access_pin'), // Short 6-10 char generated access PIN
  phase: text('phase'), // Phase 1, Phase 2, Phase 3
  name: text('name').notNull(),
  profileImage: text('profile_image'),
  coverImage: text('cover_image'),
  phoneNumber: text('phone_number'),
  isMuted: boolean('is_muted').default(false),
  role: text('role').default('RESIDENT'), // SUPERADMIN, ADMIN, EVENT_ORGANIZER, RESIDENT, SERVICE_PROVIDER
  blockLot: text('block_lot'),
  contactPreference: text('contact_preference'),
  skills: text('skills'),
  servicesOffered: text('services_offered'),
  interests: text('interests'),
  paymentQr: text('payment_qr'), // Personal GCash/Bank QR image
  approvalStatus: text('approval_status').default('PENDING'), // PENDING, APPROVED, REJECTED
  badges: text('badges').default('[]'),
  houseType: text('house_type').default('A'), // Unit Type A, B, or C
  isEmailVerified: boolean('is_email_verified').default(false),
  emailVerificationCode: text('email_verification_code'),
  isContactPublic: boolean('is_contact_public').default(false), // Is contact info explicitly published for business
  advanceCredit: decimal('advance_credit').default('0.00'),
  isFrozen: boolean('is_frozen').default(false),
  isHouseholdLeader: boolean('is_household_leader').default(false),
  isDelinquent: boolean('is_delinquent').default(false),
  delinquentReason: text('delinquent_reason'),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  businessName: text('business_name').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  contact: text('contact').notNull(),
  location: text('location'),
  verified: boolean('verified').default(false),
  featured: boolean('featured').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  sellerId: integer('seller_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  price: decimal('price').notNull(),
  image: text('image'),
  category: text('category').notNull(),
  status: text('status').default('APPROVED'),
  featured: boolean('featured').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  priority: text('priority').default('NORMAL'),
  status: text('status').default('APPROVED'),
  createdDate: timestamp('created_date').defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  date: timestamp('date').notNull(),
  location: text('location').notNull(),
  image: text('image'), // Graphic banner or hero image for event
  organizerId: integer('organizer_id').references(() => users.id),
  organizerName: text('organizer_name'),
  status: text('status').default('APPROVED'), // PENDING, APPROVED, REJECTED
  createdAt: timestamp('created_at').defaultNow(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  image: text('image'),
  location: text('location'),
  status: text('status').default('PENDING'), // PENDING, PROCESSING, RESOLVED, DISMISSED
  isConfirmed: boolean('is_confirmed').default(false), // Admin confirmation required before public feed visibility
  createdAt: timestamp('created_at').defaultNow(),
});

export const memoryVault = pgTable('memory_vault', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  story: text('story').notNull(),
  image: text('image'), // Cover image
  images: text('images'), // JSON array string for photo album slides
  date: timestamp('date').notNull(),
  status: text('status').default('APPROVED'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  number: text('number').notNull(),
  category: text('category').default('Emergency'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  channel: text('channel').default('general'),
  message: text('message').notNull(),
  flagged: boolean('flagged').default(false),
  flagReason: text('flag_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const smsLogs = pgTable('sms_logs', {
  id: serial('id').primaryKey(),
  announcementId: integer('announcement_id'),
  title: text('title').notNull(),
  message: text('message').notNull(),
  recipientsCount: integer('recipients_count').default(0),
  status: text('status').default('SENT'),
  sentAt: timestamp('sent_at').defaultNow(),
});

export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  announcementId: integer('announcement_id'),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  recipientsCount: integer('recipients_count').default(0),
  recipientsList: text('recipients_list'),
  provider: text('provider').default('RESEND'),
  status: text('status').default('SENT'),
  sentAt: timestamp('sent_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'), // null means broadcast to all residents
  type: text('type').notNull(), // 'ANNOUNCEMENT', 'REPORT', 'MARKETPLACE', 'CHAT', 'EVENT', 'BILLING'
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  read: boolean('read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const billings = pgTable('billings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  phase: text('phase'),
  blockLot: text('block_lot'),
  billingMonth: text('billing_month').notNull(), // e.g. "August 2026"
  hoaDues: decimal('hoa_dues').notNull().default('240.00'),
  prevReading: decimal('prev_reading').default('0.00'),
  currReading: decimal('curr_reading').default('0.00'),
  waterUsage: decimal('water_usage').default('0.00'), // cubic meters
  waterRate: decimal('water_rate').default('0.00'),
  waterAmount: decimal('water_amount').default('0.00'),
  arrearsAmount: decimal('arrears_amount').default('0.00'),
  penaltyAmount: decimal('penalty_amount').default('0.00'),
  advanceCreditApplied: decimal('advance_credit_applied').default('0.00'),
  amountPaid: decimal('amount_paid').default('0.00'),
  totalAmount: decimal('total_amount').notNull(),
  status: text('status').default('UNPAID'), // UNPAID, PARTIAL, PENDING_VERIFICATION, PAID
  waterStatus: text('water_status').default('UNPAID'), // UNPAID, PENDING_VERIFICATION, PAID
  waterAmountPaid: decimal('water_amount_paid').default('0.00'),
  waterPaidAt: timestamp('water_paid_at'),
  waterPaymentProof: text('water_payment_proof'),
  waterPaymentRef: text('water_payment_ref'),
  hoaStatus: text('hoa_status').default('UNPAID'), // UNPAID, PENDING_VERIFICATION, PAID
  hoaAmountPaid: decimal('hoa_amount_paid').default('0.00'),
  hoaPaidAt: timestamp('hoa_paid_at'),
  hoaPaymentProof: text('hoa_payment_proof'),
  hoaPaymentRef: text('hoa_payment_ref'),
  isOverriddenReading: boolean('is_overridden_reading').default(false),
  isDelinquent: boolean('is_delinquent').default(false),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  paymentProof: text('payment_proof'),
  paymentRef: text('payment_ref'),
  pmoNotes: text('pmo_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gateScans = pgTable('gate_scans', {
  id: serial('id').primaryKey(),
  codeScanned: text('code_scanned').notNull(),
  residentName: text('resident_name'),
  blockLot: text('block_lot'),
  phase: text('phase'),
  guardLocation: text('guard_location').default('Main Gate 1'),
  verificationStatus: text('verification_status').notNull(), // VERIFIED, INVALID, EXPIRED
  createdAt: timestamp('created_at').defaultNow(),
});

export const pets = pgTable('pets', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  ownerName: text('owner_name'),
  blockLot: text('block_lot'),
  phase: text('phase'),
  petName: text('pet_name').notNull(),
  species: text('species').notNull(), // Dog, Cat, Bird, Exotic, etc.
  breed: text('breed'),
  color: text('color'),
  age: text('age'),
  rabiesVaccinated: boolean('rabies_vaccinated').default(true),
  vaccineDate: text('vaccine_date'),
  tagNumber: text('tag_number'), // e.g. CMS-PET-0104
  photo: text('photo'),
  notes: text('notes'),
  status: text('status').default('APPROVED'), // PENDING, APPROVED, REJECTED
  createdAt: timestamp('created_at').defaultNow(),
});

export const utilitySettings = pgTable('utility_settings', {
  id: serial('id').primaryKey(),
  waterTiers: text('water_tiers').default(JSON.stringify([
    { id: 1, min: 0, max: 10, isFlatMin: true, minRate: 180, ratePerCuM: 0, label: '0-10 cu.m Minimum' },
    { id: 2, min: 11, max: 20, isFlatMin: false, minRate: 0, ratePerCuM: 22, label: '11-20 cu.m Bracket' },
    { id: 3, min: 21, max: 30, isFlatMin: false, minRate: 0, ratePerCuM: 26, label: '21-30 cu.m Bracket' },
    { id: 4, min: 31, max: 999, isFlatMin: false, minRate: 0, ratePerCuM: 32, label: '31+ cu.m Excess' }
  ])),
  phases: text('phases').default(JSON.stringify(['Phase 1', 'Phase 2', 'Phase 3', 'Phase 3A', 'Phase 3B', 'Phase 3A.2'])),
  hoaDuesTypeA: decimal('hoa_dues_type_a').default('240.00'),
  hoaDuesTypeB: decimal('hoa_dues_type_b').default('320.00'),
  hoaDuesTypeC: decimal('hoa_dues_type_c').default('480.00'),
  gcashNumber: text('gcash_number').default('0917-123-4567'),
  bdoAccount: text('bdo_account').default('0012-3456-7890'),
  accountName: text('account_name').default('Casa Mira South HOA'),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const broadcastSettings = pgTable('broadcast_settings', {
  id: serial('id').primaryKey(),
  smsProvider: text('sms_provider').default('SEMAPHORE'), // 'SEMAPHORE', 'TWILIO', 'BREVO', 'SIMULATED'
  semaphoreApiKey: text('semaphore_api_key'),
  semaphoreSenderName: text('semaphore_sender_name').default('CASAMIRA'),
  twilioAccountSid: text('twilio_account_sid'),
  twilioAuthToken: text('twilio_auth_token'),
  twilioPhoneNumber: text('twilio_phone_number'),
  emailProvider: text('email_provider').default('RESEND'), // 'RESEND', 'SENDGRID', 'BREVO', 'SMTP', 'SIMULATED'
  resendApiKey: text('resend_api_key'),
  sendgridApiKey: text('sendgrid_api_key'),
  brevoApiKey: text('brevo_api_key'),
  smtpHost: text('smtp_host'),
  smtpPort: text('smtp_port').default('587'),
  smtpUser: text('smtp_user'),
  smtpPass: text('smtp_pass'),
  emailFrom: text('email_from').default('Casa Mira South HOA <notifications@casamirasouth.com>'),
  testPhone: text('test_phone').default('+639272815880'),
  testEmail: text('test_email').default('kit.g3nity@gmail.com'),
  updatedAt: timestamp('updated_at').defaultNow()
});

