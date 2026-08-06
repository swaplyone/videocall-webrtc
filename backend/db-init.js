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

      INSERT INTO beta_config (id, max_capacity, daily_batch_size, rollout_active, expiry_hours)
      VALUES (1, 150, 10, TRUE, 72)
      ON CONFLICT (id) DO NOTHING;

      -- Phase 12: Enterprise Production Suite Tables & Columns
      ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_status VARCHAR(50) DEFAULT 'online';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS call_preferences JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read_status BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notif_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notif_category ON notifications(category);

      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        device_name VARCHAR(100),
        browser VARCHAR(100),
        os VARCHAR(100),
        ip_address VARCHAR(100),
        location VARCHAR(100),
        is_trusted BOOLEAN DEFAULT FALSE,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_us_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_us_token ON user_sessions(session_token);

      CREATE TABLE IF NOT EXISTS feedback_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        rating INTEGER,
        description TEXT NOT NULL,
        log_payload JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'SUBMITTED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fr_user_id ON feedback_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_fr_type ON feedback_reports(type);

      CREATE TABLE IF NOT EXISTS changelog_entries (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ce_category ON changelog_entries(category);

      -- Phase 14 Migrations
      CREATE TABLE IF NOT EXISTS user_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        policy_type VARCHAR(50) NOT NULL,
        version VARCHAR(50) NOT NULL,
        consented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS legal_policy_versions (
        id SERIAL PRIMARY KEY,
        policy_type VARCHAR(50) UNIQUE NOT NULL,
        version VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        target_id INTEGER,
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS api_logs (
        id SERIAL PRIMARY KEY,
        method VARCHAR(10) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        status_code INTEGER NOT NULL,
        response_time INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) DEFAULT 'warning',
        details JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS feature_flags (
        key VARCHAR(100) PRIMARY KEY,
        enabled BOOLEAN DEFAULT TRUE,
        description TEXT,
        category VARCHAR(50) DEFAULT 'core',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS maintenance_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        active BOOLEAN DEFAULT FALSE,
        mode VARCHAR(50) DEFAULT 'scheduled',
        message TEXT DEFAULT 'System undergoes scheduled maintenance.',
        scheduled_start TIMESTAMP,
        scheduled_end TIMESTAMP,
        countdown_seconds INTEGER DEFAULT 0,
        whitelisted_ips JSONB DEFAULT '[]'::jsonb,
        whitelisted_admin_ids JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO maintenance_state (id, active, mode, message)
      VALUES (1, FALSE, 'scheduled', 'System is operational.')
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        permission_code VARCHAR(100) REFERENCES permissions(code) ON DELETE CASCADE,
        PRIMARY KEY(role_id, permission_code)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY(user_id, role_id)
      );

      CREATE TABLE IF NOT EXISTS media_files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        category VARCHAR(50) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100),
        virus_scanned BOOLEAN DEFAULT TRUE,
        is_temp BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recent_searches (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Phase 10, Phase 11, Phase 12 & Phase 14 database migrations applied successfully!');
    return true;
  } catch (err) {
    console.error('❌ Phase 10 database migration error:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('db-init.js')) {
  runDbMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
