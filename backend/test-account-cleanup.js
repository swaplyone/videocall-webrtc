import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { runDbMigrations } from './db-init.js';
import { executePermanentAccountCleanup } from './services/accountDeletionService.js';

async function runCleanupTests() {
  console.log('🧪 Starting Phase 10 Permanent Data Cleanup Tests...');
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

  const testUsername = `cleanuptest_${Date.now()}`;
  const testEmail = `${testUsername}@swaplytest.com`;

  try {
    await runDbMigrations();

    // 1. Create dummy user and dependencies
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password123!', salt);
    const secId = `sec_cleanup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const insertRes = await query(`
      INSERT INTO users (username, email, password_hash, beta_id, name, security_id, deletion_status)
      VALUES ($1, $2, $3, $4, 'Cleanup Test User', $5, 'PENDING_DELETION')
      RETURNING id
    `, [testUsername, testEmail, hash, `SWP-CLEANUP`, secId]);
    const userId = insertRes.rows[0].id;

    await query(`
      INSERT INTO account_deletion_requests (user_id, deletion_reason, deletion_status, scheduled_deletion_at)
      VALUES ($1, 'Testing Permanent Cleanup', 'PENDING_DELETION', NOW())
    `, [userId]);

    // 2. Execute permanent cleanup
    await executePermanentAccountCleanup(userId);

    // 3. Verify user record is purged
    const checkUser = await query('SELECT 1 FROM users WHERE id = $1', [userId]);
    assert(checkUser.rows.length === 0, 'User profile record permanently purged from users table');

    // 4. Verify account_deletion_requests updated to PERMANENTLY_DELETED
    const checkReq = await query('SELECT deletion_status FROM account_deletion_requests WHERE user_id = $1', [userId]);
    assert(checkReq.rows.length === 0 || checkReq.rows[0].deletion_status === 'PERMANENTLY_DELETED', 'account_deletion_requests marked PERMANENTLY_DELETED');

  } catch (err) {
    console.error('❌ Permanent Cleanup Test error:', err);
    testsFailed++;
  }

  console.log(`\n📊 Permanent Cleanup Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

runCleanupTests();
