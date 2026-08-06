import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { runDbMigrations } from './db-init.js';
import { scheduleDelayedDeletionJob, cancelDelayedDeletionJob, initAccountDeletionScheduler } from './services/accountDeletionService.js';

async function runSchedulerTests() {
  console.log('🧪 Starting Phase 10 Scheduler & Timer Tests...');
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

  const testUsername = `schedtest_${Date.now()}`;
  const testEmail = `${testUsername}@swaplytest.com`;

  try {
    await runDbMigrations();

    // 1. Create dummy user
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Password123!', salt);
    const insertRes = await query(`
      INSERT INTO users (username, email, password_hash, beta_id, name, security_id, deletion_status)
      VALUES ($1, $2, $3, $4, 'Scheduler Test User', 'sec_sched_123', 'PENDING_DELETION')
      RETURNING id
    `, [testUsername, testEmail, hash, `SWP-SCHEDTEST`]);
    const userId = insertRes.rows[0].id;

    // 2. Insert deletion request
    const futureTime = new Date(Date.now() + 5000); // 5 seconds in future
    await query(`
      INSERT INTO account_deletion_requests (user_id, deletion_reason, deletion_status, scheduled_deletion_at)
      VALUES ($1, 'Testing Scheduler', 'PENDING_DELETION', $2)
    `, [userId, futureTime]);

    // 3. Test scheduling job
    scheduleDelayedDeletionJob(userId, futureTime);
    assert(true, 'scheduleDelayedDeletionJob executed without throwing');

    // 4. Test cancelling job
    cancelDelayedDeletionJob(userId);
    assert(true, 'cancelDelayedDeletionJob executed without throwing');

    // 5. Test scheduler init scan
    await initAccountDeletionScheduler();
    assert(true, 'initAccountDeletionScheduler scanned DB and initialized cleanly');

    // Clean up
    await query('DELETE FROM users WHERE id = $1', [userId]);

  } catch (err) {
    console.error('❌ Scheduler Test error:', err);
    testsFailed++;
  }

  console.log(`\n📊 Scheduler Test Summary: ${testsPassed} Passed, ${testsFailed} Failed.`);
  process.exit(testsFailed > 0 ? 1 : 0);
}

runSchedulerTests();
