import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { runDbMigrations } from './db-init.js';

async function runRecoveryTests() {
  console.log('🧪 Starting Phase 10 Account Recovery Tests...');
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

  const testUsername = `recovtest_${Date.now()}`;
  const testEmail = `${testUsername}@swaplytest.com`;

  try {
    await runDbMigrations();

    // 1. Create user and set to PENDING_DELETION
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password123!', salt);
    const scheduledTime = new Date(Date.now() + 5 * 60 * 60 * 1000);

    const insertRes = await query(`
      INSERT INTO users (username, email, password_hash, beta_id, name, security_id, deletion_status, scheduled_deletion_at)
      VALUES ($1, $2, $3, $4, 'Recovery Test User', 'sec_recov_123', 'PENDING_DELETION', $5)
      RETURNING id
    `, [testUsername, testEmail, hash, `SWP-RECOVTEST`, scheduledTime]);
    const userId = insertRes.rows[0].id;

    await query(`
      INSERT INTO account_deletion_requests (user_id, deletion_reason, deletion_status, scheduled_deletion_at)
      VALUES ($1, 'Testing Recovery', 'PENDING_DELETION', $2)
    `, [userId, scheduledTime]);

    // 2. Perform Account Recovery Simulation
    const now = new Date();
    await query(`
      UPDATE users 
      SET deletion_status = 'ACTIVE',
          recovered_at = $1,
          scheduled_deletion_at = NULL,
          deletion_requested_at = NULL,
          deletion_reason = NULL
      WHERE id = $2
    `, [now, userId]);

    await query(`
      UPDATE account_deletion_requests 
      SET deletion_status = 'RECOVERED',
          recovered_at = $1
      WHERE user_id = $2 AND deletion_status = 'PENDING_DELETION'
    `, [now, userId]);

    // 3. Verify status
    const checkRes = await query('SELECT deletion_status, recovered_at FROM users WHERE id = $1', [userId]);
    assert(checkRes.rows[0].deletion_status === 'ACTIVE', 'User profile status restored to ACTIVE');
    assert(checkRes.rows[0].recovered_at !== null, 'recovered_at timestamp recorded');

    const reqRes = await query('SELECT deletion_status FROM account_deletion_requests WHERE user_id = $1', [userId]);
    assert(reqRes.rows[0].deletion_status === 'RECOVERED', 'account_deletion_requests status set to RECOVERED');

    // Clean up
    await query('DELETE FROM users WHERE id = $1', [userId]);

  } catch (err) {
    console.error('❌ Recovery Test error:', err);
    testsFailed++;
  }

  console.log(`\n📊 Account Recovery Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

runRecoveryTests();
