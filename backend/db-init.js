import { query } from './db.js';

export async function runDbMigrations() {
  console.log('🔄 Running Phase 10 database migrations...');
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(50) DEFAULT 'ACTIVE';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS recovered_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

      CREATE TABLE IF NOT EXISTS account_deletion_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(100),
        email VARCHAR(255),
        beta_id VARCHAR(50),
        deletion_reason TEXT,
        deletion_status VARCHAR(50) DEFAULT 'PENDING_DELETION',
        deletion_requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scheduled_deletion_at TIMESTAMP NOT NULL,
        recovered_at TIMESTAMP,
        ip_address VARCHAR(100),
        user_agent TEXT
      );

      ALTER TABLE account_deletion_requests ADD COLUMN IF NOT EXISTS username VARCHAR(100);
      ALTER TABLE account_deletion_requests ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      ALTER TABLE account_deletion_requests ADD COLUMN IF NOT EXISTS beta_id VARCHAR(50);

      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'account_deletion_requests_user_id_fkey'
        ) THEN
          ALTER TABLE account_deletion_requests DROP CONSTRAINT account_deletion_requests_user_id_fkey;
          ALTER TABLE account_deletion_requests ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_adr_user_id ON account_deletion_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_adr_status ON account_deletion_requests(deletion_status);
      CREATE INDEX IF NOT EXISTS idx_adr_scheduled ON account_deletion_requests(scheduled_deletion_at);

      -- Phase 11: Beta Waitlist & Config Tables
      CREATE TABLE IF NOT EXISTS beta_waitlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        beta_id VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        registration_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        waitlist_position INTEGER,
        rollout_batch INTEGER DEFAULT 1,
        rollout_status VARCHAR(50) DEFAULT 'WAITING_QUEUE',
        invite_sent_time TIMESTAMP,
        invitation_expiry_time TIMESTAMP,
        activation_code VARCHAR(100),
        admin_notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_bw_user_id ON beta_waitlist(user_id);
      CREATE INDEX IF NOT EXISTS idx_bw_status ON beta_waitlist(rollout_status);
      CREATE INDEX IF NOT EXISTS idx_bw_position ON beta_waitlist(waitlist_position);
      CREATE INDEX IF NOT EXISTS idx_bw_expiry ON beta_waitlist(invitation_expiry_time);
      CREATE INDEX IF NOT EXISTS idx_bw_code ON beta_waitlist(activation_code);

      CREATE TABLE IF NOT EXISTS beta_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        max_capacity INTEGER DEFAULT 150,
        daily_batch_size INTEGER DEFAULT 10,
        rollout_active BOOLEAN DEFAULT TRUE,
        expiry_hours INTEGER DEFAULT 72,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO beta_config (id, max_capacity, daily_batch_size, rollout_active, expiry_hours)
      VALUES (1, 150, 10, TRUE, 72)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Phase 10 & Phase 11 database migrations applied successfully!');
    return true;
  } catch (err) {
    console.error('❌ Phase 10 database migration error:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('db-init.js')) {
  runDbMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
