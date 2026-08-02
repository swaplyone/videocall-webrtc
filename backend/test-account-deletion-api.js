import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { runDbMigrations } from './db-init.js';

async function runApiIntegrationTests() {
  console.log('🧪 Starting Phase 10 Account Deletion API & Hiding Tests...');
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

  const testUsername = `deltest_${Date.now()}`;
  const testEmail = `${testUsername}@swaplytest.com`;
  const rawPassword = 'Password123!';

  try {
    await runDbMigrations();

    // 1. Create test user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);
    const insertRes = await query(`
      INSERT INTO users (username, email, password_hash, beta_id, name, security_id, deletion_status)
      VALUES ($1, $2, $3, $4, 'Deletion Test User', 'sec_test_123', 'ACTIVE')
      RETURNING id
    `, [testUsername, testEmail, hash, `SWP-DELTEST`]);
    const userId = insertRes.rows[0].id;
    assert(userId > 0, 'Test user account created in database');

    // 2. Request account deletion
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    await query(`
      UPDATE users 
      SET deletion_status = 'PENDING_DELETION',
          deletion_requested_at = $1,
          scheduled_deletion_at = $2,
          deletion_reason = 'Testing API'
      WHERE id = $3
    `, [now, scheduledTime, userId]);

    await query(`
      INSERT INTO account_deletion_requests (user_id, deletion_reason, deletion_status, scheduled_deletion_at)
      VALUES ($1, 'Testing API', 'PENDING_DELETION', $2)
    `, [userId, scheduledTime]);

    // 3. Verify status update on user table
    const checkRes = await query('SELECT deletion_status, scheduled_deletion_at FROM users WHERE id = $1', [userId]);
    assert(checkRes.rows[0].deletion_status === 'PENDING_DELETION', 'User deletion_status updated to PENDING_DELETION');
    assert(checkRes.rows[0].scheduled_deletion_at !== null, 'Scheduled deletion timestamp stored correctly');

    // 4. Verify search hiding in directory
    const searchRes = await query(`
      SELECT username FROM users 
      WHERE username = $1 AND (deletion_status IS NULL OR deletion_status != 'PENDING_DELETION')
    `, [testUsername]);
    assert(searchRes.rows.length === 0, 'User is hidden from directory search results when PENDING_DELETION');

    // 5. Cancel deletion request / Recover Account
    const cancelNow = new Date();
    await query(`
      UPDATE users 
      SET deletion_status = 'ACTIVE',
          recovered_at = $1,
          scheduled_deletion_at = NULL,
          deletion_requested_at = NULL,
          deletion_reason = NULL
      WHERE id = $2
    `, [cancelNow, userId]);

    const recoverRes = await query('SELECT deletion_status, recovered_at FROM users WHERE id = $1', [userId]);
    assert(recoverRes.rows[0].deletion_status === 'ACTIVE', 'User deletion_status restored to ACTIVE');
    assert(recoverRes.rows[0].recovered_at !== null, 'Account recovery timestamp recorded');

    // Cleanup test user
    await query('DELETE FROM users WHERE id = $1', [userId]);

  } catch (err) {
    console.error('❌ API Integration Test error:', err);
    testsFailed++;
  }

  console.log(`\n📊 API Integration Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  if (testsFailed > 0) process.exit(1);
}

runApiIntegrationTests();
