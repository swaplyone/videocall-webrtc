import 'dotenv/config';
import { query } from './db.js';
import { runDbMigrations } from './db-init.js';

async function runDbIntegrityTests() {
  console.log('🧪 Starting Phase 10 Database Integrity Tests...');
  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition, description) => {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      testsFailed++;
    }
  };

  try {
    // Test 1: Migrations
    await runDbMigrations();
    assert(true, 'Database migrations execute cleanly without error');

    // Test 2: Check columns on users table
    const columnsRes = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('deletion_status', 'deletion_requested_at', 'scheduled_deletion_at', 'recovered_at', 'deletion_reason')
    `);
    assert(columnsRes.rows.length === 5, 'All 5 deletion tracking columns exist on users table');

    // Test 3: Check account_deletion_requests table
    const tableRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'account_deletion_requests'
    `);
    assert(tableRes.rows.length === 1, 'account_deletion_requests table exists in database');

    // Test 4: Verify indexes
    const indexRes = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'account_deletion_requests'
    `);
    const indexNames = indexRes.rows.map(r => r.indexname);
    assert(indexNames.includes('idx_adr_user_id'), 'idx_adr_user_id index exists');
    assert(indexNames.includes('idx_adr_status'), 'idx_adr_status index exists');
    assert(indexNames.includes('idx_adr_scheduled'), 'idx_adr_scheduled index exists');

  } catch (err) {
    console.error('❌ Test execution error:', err);
    testsFailed++;
  }

  console.log(`\n📊 DB Integrity Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  if (testsFailed > 0) process.exit(1);
}

runDbIntegrityTests();
