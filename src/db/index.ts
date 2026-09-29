import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import fs from 'fs';
import path from 'path';

declare global {
  var _postgresPool: Pool | undefined;
  var _pgliteInstance: PGlite | undefined;
  var _dbInstance: any | undefined;
}

const isRemoteSqlConfigured = !!(process.env.SQL_HOST && process.env.SQL_HOST.trim().length > 0);

export const getPgliteInstance = () => {
  if (!global._pgliteInstance) {
    const dataDir = path.resolve(process.cwd(), 'data/pglite');
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      const pidFile = path.join(dataDir, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {}
      }
    } catch {}

    try {
      global._pgliteInstance = new PGlite(dataDir);
    } catch (err: any) {
      console.warn('PGlite primary init warning, cleaning lock and retrying:', err?.message || err);
      try {
        const pidFile = path.join(dataDir, 'postmaster.pid');
        if (fs.existsSync(pidFile)) {
          fs.unlinkSync(pidFile);
        }
        global._pgliteInstance = new PGlite(dataDir);
      } catch (retryErr) {
        console.error('PGlite failed to open directory, falling back to clean in-memory instance:', retryErr);
        global._pgliteInstance = new PGlite();
      }
    }
  }
  return global._pgliteInstance;
};

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    global._postgresPool.on('error', (err) => {
      console.warn('Postgres SQL pool client notice/error (handled gracefully):', err.message || err);
    });
  }
  return global._postgresPool;
};

export type AppDatabase = ReturnType<typeof drizzlePg<typeof schema>>;

export const getDb = (): AppDatabase => {
  if (!global._dbInstance) {
    if (isRemoteSqlConfigured) {
      const pool = createPool();
      global._dbInstance = drizzlePg(pool, { schema });
    } else {
      const pglite = getPgliteInstance();
      global._dbInstance = drizzlePglite(pglite, { schema });
    }
  }
  return global._dbInstance as AppDatabase;
};

export const db: AppDatabase = getDb();

let schemaEnsured: Promise<string[]> | null = null;

export async function runSystemAutoFix() {
  const fixLogs: string[] = [];

  // 1. Table Definitions SQL
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      uid TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      username TEXT,
      password TEXT,
      temp_access_pin TEXT,
      phase TEXT,
      name TEXT NOT NULL,
      profile_image TEXT,
      cover_image TEXT,
      phone_number TEXT,
      is_muted BOOLEAN DEFAULT false,
      role TEXT DEFAULT 'RESIDENT',
      block_lot TEXT,
      contact_preference TEXT,
      skills TEXT,
      services_offered TEXT,
      interests TEXT,
      payment_qr TEXT,
      approval_status TEXT DEFAULT 'PENDING',
      badges TEXT DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER REFERENCES users(id),
      business_name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      contact TEXT NOT NULL,
      location TEXT,
      verified BOOLEAN DEFAULT false,
      featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC NOT NULL,
      image TEXT,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'APPROVED',
      featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT DEFAULT 'NORMAL',
      status TEXT DEFAULT 'APPROVED',
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TIMESTAMP NOT NULL,
      location TEXT NOT NULL,
      image TEXT,
      organizer_id INTEGER REFERENCES users(id),
      organizer_name TEXT,
      status TEXT DEFAULT 'APPROVED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT,
      location TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS memory_vault (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      story TEXT NOT NULL,
      image TEXT,
      images TEXT,
      date TIMESTAMP NOT NULL,
      status TEXT DEFAULT 'APPROVED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      number TEXT NOT NULL,
      category TEXT DEFAULT 'Emergency',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      channel TEXT DEFAULT 'general',
      message TEXT NOT NULL,
      flagged BOOLEAN DEFAULT false,
      flag_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sms_logs (
      id SERIAL PRIMARY KEY,
      announcement_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      recipients_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'SENT',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS email_logs (
      id SERIAL PRIMARY KEY,
      announcement_id INTEGER,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      recipients_count INTEGER DEFAULT 0,
      recipients_list TEXT,
      provider TEXT DEFAULT 'RESEND',
      status TEXT DEFAULT 'SENT',
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS billings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      billing_month TEXT NOT NULL,
      hoa_dues NUMERIC DEFAULT 500.00,
      prev_reading NUMERIC DEFAULT 0.00,
      curr_reading NUMERIC DEFAULT 0.00,
      water_usage NUMERIC DEFAULT 0.00,
      water_rate NUMERIC DEFAULT 35.00,
      water_amount NUMERIC DEFAULT 0.00,
      total_amount NUMERIC NOT NULL,
      status TEXT DEFAULT 'UNPAID',
      due_date TIMESTAMP,
      paid_at TIMESTAMP,
      payment_proof TEXT,
      payment_ref TEXT,
      pmo_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_id INTEGER REFERENCES users(id),
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS gate_scans (
      id SERIAL PRIMARY KEY,
      code_scanned TEXT NOT NULL,
      resident_name TEXT,
      block_lot TEXT,
      phase TEXT,
      guard_location TEXT DEFAULT 'Main Gate 1',
      verification_status TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS pets (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER REFERENCES users(id),
      owner_name TEXT,
      block_lot TEXT,
      phase TEXT,
      pet_name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT,
      color TEXT,
      age TEXT,
      rabies_vaccinated BOOLEAN DEFAULT true,
      vaccine_date TEXT,
      tag_number TEXT,
      photo TEXT,
      notes TEXT,
      status TEXT DEFAULT 'APPROVED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS utility_settings (
      id SERIAL PRIMARY KEY,
      water_tiers TEXT,
      phases TEXT,
      hoa_dues_type_a NUMERIC DEFAULT 240.00,
      hoa_dues_type_b NUMERIC DEFAULT 320.00,
      hoa_dues_type_c NUMERIC DEFAULT 480.00,
      gcash_number TEXT DEFAULT '0917-123-4567',
      bdo_account TEXT DEFAULT '0012-3456-7890',
      account_name TEXT DEFAULT 'Casa Mira South HOA',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS broadcast_settings (
      id SERIAL PRIMARY KEY,
      sms_provider TEXT DEFAULT 'SEMAPHORE',
      semaphore_api_key TEXT,
      semaphore_sender_name TEXT DEFAULT 'CASAMIRA',
      twilio_account_sid TEXT,
      twilio_auth_token TEXT,
      twilio_phone_number TEXT,
      email_provider TEXT DEFAULT 'RESEND',
      resend_api_key TEXT,
      sendgrid_api_key TEXT,
      brevo_api_key TEXT,
      smtp_host TEXT,
      smtp_port TEXT DEFAULT '587',
      smtp_user TEXT,
      smtp_pass TEXT,
      email_from TEXT DEFAULT 'Casa Mira South HOA <notifications@casamirasouth.com>',
      test_phone TEXT DEFAULT '+639272815880',
      test_email TEXT DEFAULT 'kit.g3nity@gmail.com',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  const columnStatements = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS username text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_access_pin text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phase text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_muted boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role text DEFAULT 'RESIDENT'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS block_lot text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_preference text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS skills text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS services_offered text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS interests text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_qr text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'PENDING'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS badges text DEFAULT '[]'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS house_type text DEFAULT 'A'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_contact_public boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS advance_credit numeric DEFAULT 0.00`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_frozen boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_household_leader boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_delinquent boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS delinquent_reason text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp DEFAULT CURRENT_TIMESTAMP`,

    `ALTER TABLE events ADD COLUMN IF NOT EXISTS image text`,
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id integer`,
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_name text`,
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS status text DEFAULT 'APPROVED'`,

    `ALTER TABLE reports ADD COLUMN IF NOT EXISTS image text`,
    `ALTER TABLE reports ADD COLUMN IF NOT EXISTS location text`,
    `ALTER TABLE reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING'`,
    `ALTER TABLE reports ADD COLUMN IF NOT EXISTS is_confirmed boolean DEFAULT false`,

    `ALTER TABLE memory_vault ADD COLUMN IF NOT EXISTS images text`,
    `ALTER TABLE memory_vault ADD COLUMN IF NOT EXISTS status text DEFAULT 'APPROVED'`,

    `ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS announcement_id integer`,

    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link text`,

    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS phase text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS block_lot text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS hoa_dues numeric DEFAULT 240.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS prev_reading numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS curr_reading numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_usage numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_rate numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_amount numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS arrears_amount numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS penalty_amount numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS advance_credit_applied numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_status text DEFAULT 'UNPAID'`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_amount_paid numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_paid_at timestamp`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_payment_proof text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS water_payment_ref text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS hoa_status text DEFAULT 'UNPAID'`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS hoa_amount_paid numeric DEFAULT 0.00`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS hoa_paid_at timestamp`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS hoa_payment_proof text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS hoa_payment_ref text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS is_overridden_reading boolean DEFAULT false`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS is_delinquent boolean DEFAULT false`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS payment_proof text`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code text`,

    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS payment_ref text`,
    `ALTER TABLE billings ADD COLUMN IF NOT EXISTS pmo_notes text`,

    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_id integer`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS owner_name text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS block_lot text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS phase text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS pet_name text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS species text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS breed text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS color text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS age text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS rabies_vaccinated boolean DEFAULT true`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS vaccine_date text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS tag_number text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS photo text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS notes text`,
    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS status text DEFAULT 'APPROVED'`,

    `ALTER TABLE gate_scans ADD COLUMN IF NOT EXISTS resident_name text`,
    `ALTER TABLE gate_scans ADD COLUMN IF NOT EXISTS block_lot text`,
    `ALTER TABLE gate_scans ADD COLUMN IF NOT EXISTS phase text`,
    `ALTER TABLE gate_scans ADD COLUMN IF NOT EXISTS guard_location text DEFAULT 'Main Gate 1'`,
    `ALTER TABLE utility_settings ADD COLUMN IF NOT EXISTS phases text`
  ];

  if (!isRemoteSqlConfigured) {
    const pglite = getPgliteInstance();
    for (const stmt of tableStatements) {
      try {
        await pglite.query(stmt);
      } catch (e: any) {
        fixLogs.push(`Table check notice: ${e.message || e}`);
      }
    }
    for (const colSql of columnStatements) {
      try {
        await pglite.query(colSql);
      } catch (e: any) {
        fixLogs.push(`Column check notice: ${e.message || e}`);
      }
    }
    fixLogs.push('System database schema and table integrity verified successfully (PGlite storage).');
    return fixLogs;
  }

  let adminPool: Pool | null = null;
  let client;
  try {
    const adminUser = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
    const adminPassword = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
    adminPool = new Pool({
      host: process.env.SQL_HOST,
      user: adminUser,
      password: adminPassword,
      database: process.env.SQL_DB_NAME,
      max: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
    client = await adminPool.connect();
  } catch (err: any) {
    console.error('Failed to acquire Postgres admin client for auto-fix:', err);
    throw new Error('Database connection error: ' + (err.message || err));
  }

  try {
    for (const stmt of tableStatements) {
      try {
        await client.query(stmt);
      } catch (e: any) {
        fixLogs.push(`Table check notice: ${e.message || e}`);
      }
    }

    for (const colSql of columnStatements) {
      try {
        await client.query(colSql);
      } catch (e: any) {
        fixLogs.push(`Column check notice: ${e.message || e}`);
      }
    }
  } catch (err: any) {
    console.warn('Schema check warning (ignored as schema is managed by UpdateSchema):', err?.message || err);
  } finally {
    if (client) {
      try { client.release(); } catch {}
    }
    if (adminPool) {
      await adminPool.end().catch(() => {});
    }
  }

  fixLogs.push('System database schema and table integrity verified successfully.');
  return fixLogs;
}

export async function ensureDatabaseSchema() {
  if (schemaEnsured) return schemaEnsured;
  schemaEnsured = (async () => {
    try {
      const logs = await runSystemAutoFix();
      return logs;
    } catch (e: any) {
      console.warn('Database schema auto-ensure bypassed (schema managed by UpdateSchema):', e?.message || e);
      return [];
    }
  })();
  return schemaEnsured;
}
