import { query } from './db.js';
import { runDbMigrations } from './db-init.js';

async function runPhase12Tests() {
  console.log('🧪 Starting Phase 12 Enterprise Production Suite Integration Tests...');
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
    assert(true, 'Phase 12 Database migrations executed cleanly');

    // 1. Verify notifications table insertion and query
    const notifRes = await query(`
      INSERT INTO notifications (category, title, message)
      VALUES ('SYSTEM_TEST', 'Phase 12 Notification Test', 'Testing notification engine...')
      RETURNING *
    `);
    assert(notifRes.rows.length === 1, 'Notifications record inserted successfully');

    // 2. Verify user_sessions table insertion and query
    const sessionRes = await query(`
      INSERT INTO user_sessions (session_token, device_name, browser, os, ip_address)
      VALUES ('test_token_p12', 'Test Laptop', 'Chrome', 'Windows', '127.0.0.1')
      RETURNING *
    `);
    assert(sessionRes.rows.length === 1, 'User session record inserted successfully');

    // 3. Verify feedback_reports table
    const fbRes = await query(`
      INSERT INTO feedback_reports (type, rating, description)
      VALUES ('BUG_REPORT', 5, 'Phase 12 Automated Feedback Test')
      RETURNING *
    `);
    assert(fbRes.rows.length === 1, 'Feedback report inserted successfully');

    // 4. Verify changelog_entries table
    const clRes = await query(`
      INSERT INTO changelog_entries (version, title, category, content)
      VALUES ('v2.5.0-test', 'Phase 12 Automated Test Version', 'FEATURE', 'Test release notes content')
      RETURNING *
    `);
    assert(clRes.rows.length === 1, 'Changelog entry inserted successfully');

    // Cleanup test records
    await query("DELETE FROM notifications WHERE category = 'SYSTEM_TEST'");
    await query("DELETE FROM user_sessions WHERE session_token = 'test_token_p12'");
    await query("DELETE FROM feedback_reports WHERE description = 'Phase 12 Automated Feedback Test'");
    await query("DELETE FROM changelog_entries WHERE version = 'v2.5.0-test'");

    assert(true, 'Test records cleaned up cleanly');

  } catch (err) {
    console.error('Phase 12 Integration Test Error:', err);
    failed++;
  }

  console.log(`\n📊 Phase 12 Production Test Summary: ${passed} Passed, ${failed} Failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

runPhase12Tests();
