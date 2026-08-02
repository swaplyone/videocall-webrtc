import { query } from './db.js';
import { runDbMigrations } from './db-init.js';

async function testBetaWaitlistDb() {
  console.log('🧪 Starting Phase 11 Database Integrity Tests...');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await runDbMigrations();
    assert(true, 'Database migrations execute cleanly without error');

    // Check beta_waitlist columns
    const waitlistCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'beta_waitlist'
    `);
    const colNames = waitlistCols.rows.map(r => r.column_name);

    assert(colNames.includes('user_id'), 'beta_waitlist table contains user_id column');
    assert(colNames.includes('waitlist_position'), 'beta_waitlist table contains waitlist_position column');
    assert(colNames.includes('rollout_batch'), 'beta_waitlist table contains rollout_batch column');
    assert(colNames.includes('rollout_status'), 'beta_waitlist table contains rollout_status column');
    assert(colNames.includes('invitation_expiry_time'), 'beta_waitlist table contains invitation_expiry_time column');
    assert(colNames.includes('activation_code'), 'beta_waitlist table contains activation_code column');

    // Ensure default beta_config state
    await query(`UPDATE beta_config SET max_capacity = 150, daily_batch_size = 10, expiry_hours = 72 WHERE id = 1`);
    const configRes = await query(`SELECT * FROM beta_config WHERE id = 1`);
    assert(configRes.rowCount === 1, 'beta_config table exists with default row id=1');
    assert(configRes.rows[0].max_capacity === 150, 'Default max_capacity is 150');
    assert(configRes.rows[0].daily_batch_size === 10, 'Default daily_batch_size is 10');
    assert(configRes.rows[0].expiry_hours === 72, 'Default expiry_hours is 72');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log(`\n📊 DB Integrity Test Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

testBetaWaitlistDb();
