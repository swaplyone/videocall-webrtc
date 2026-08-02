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
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        deletion_reason TEXT,
        deletion_status VARCHAR(50) DEFAULT 'PENDING_DELETION',
        deletion_requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scheduled_deletion_at TIMESTAMP NOT NULL,
        recovered_at TIMESTAMP,
        ip_address VARCHAR(100),
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_adr_user_id ON account_deletion_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_adr_status ON account_deletion_requests(deletion_status);
      CREATE INDEX IF NOT EXISTS idx_adr_scheduled ON account_deletion_requests(scheduled_deletion_at);
    `);
    console.log('✅ Phase 10 database migrations applied successfully!');
    return true;
  } catch (err) {
    console.error('❌ Phase 10 database migration error:', err);
    throw err;
  }
}

if (process.argv[1] && process.argv[1].endsWith('db-init.js')) {
  runDbMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
