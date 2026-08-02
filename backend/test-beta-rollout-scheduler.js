import { query } from './db.js';
import { runDbMigrations } from './db-init.js';
import * as betaRolloutService from './services/betaRolloutService.js';

async function testBetaRolloutScheduler() {
  console.log('🧪 Starting Phase 11 Smart Rollout Scheduler & Expiry Tests...');
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

    // Clean test waitlist records
    await query("DELETE FROM beta_waitlist WHERE email LIKE '%@test-rollout.app'");
    await query("DELETE FROM users WHERE email LIKE '%@test-rollout.app'");

    // Set test capacity = 2, daily batch = 1
    await betaRolloutService.updateBetaConfig({ max_capacity: 2, daily_batch_size: 1, expiry_hours: 1 });

    // Create 3 test users
    const u1 = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
      VALUES ('sec_r_1', 'Rollout User 1', 'r_user_1', 'u1@test-rollout.app', 'hash', 'SWP-R1')
      RETURNING *
    `);
    const u2 = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
      VALUES ('sec_r_2', 'Rollout User 2', 'r_user_2', 'u2@test-rollout.app', 'hash', 'SWP-R2')
      RETURNING *
    `);
    const u3 = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
      VALUES ('sec_r_3', 'Rollout User 3', 'r_user_3', 'u3@test-rollout.app', 'hash', 'SWP-R3')
      RETURNING *
    `);

    // Register all 3
    const entry1 = await betaRolloutService.registerUserForWaitlist({ userId: u1.rows[0].id, username: u1.rows[0].username, email: u1.rows[0].email, betaId: u1.rows[0].beta_id });
    const entry2 = await betaRolloutService.registerUserForWaitlist({ userId: u2.rows[0].id, username: u2.rows[0].username, email: u2.rows[0].email, betaId: u2.rows[0].beta_id });
    const entry3 = await betaRolloutService.registerUserForWaitlist({ userId: u3.rows[0].id, username: u3.rows[0].username, email: u3.rows[0].email, betaId: u3.rows[0].beta_id });

    // Verify slot allocation: 2 capacity -> Users 1 & 2 READY_FOR_ROLLOUT, User 3 WAITING_QUEUE
    assert(entry1.rollout_status === 'READY_FOR_ROLLOUT', 'User 1 marked READY_FOR_ROLLOUT within capacity');
    assert(entry2.rollout_status === 'READY_FOR_ROLLOUT', 'User 2 marked READY_FOR_ROLLOUT within capacity');
    assert(entry3.rollout_status === 'WAITING_QUEUE', 'User 3 placed in WAITING_QUEUE when capacity full');

    // Simulate batch approval for User 1
    const inv1 = await betaRolloutService.sendBetaInvitationToUser(entry1.id, 'Approved batch 1');
    assert(inv1.rollout_status === 'INVITED', 'User 1 invited by admin batch controller');

    // Simulate expired invitation for User 1
    await query("UPDATE beta_waitlist SET invitation_expiry_time = CURRENT_TIMESTAMP - INTERVAL '10 minutes' WHERE id = $1", [entry1.id]);
    const expResult = await betaRolloutService.processExpiredInvitations();
    assert(expResult.expiredCount === 1, 'Expired invitation processed by background worker');

    // Check that User 1 is EXPIRED and User 3 was promoted to READY_FOR_ROLLOUT
    const check1 = await query("SELECT * FROM beta_waitlist WHERE id = $1", [entry1.id]);
    const check3 = await query("SELECT * FROM beta_waitlist WHERE id = $1", [entry3.id]);
    assert(check1.rows[0].rollout_status === 'EXPIRED', 'User 1 status is EXPIRED');
    assert(check3.rows[0].rollout_status === 'READY_FOR_ROLLOUT' || check3.rows[0].rollout_status === 'INVITED', 'User 3 promoted into freed capacity slot');

    // Restore capacity to default 150 & expiry_hours to 72
    await betaRolloutService.updateBetaConfig({ max_capacity: 150, daily_batch_size: 10, expiry_hours: 72 });

    // Cleanup
    await query("DELETE FROM beta_waitlist WHERE email LIKE '%@test-rollout.app'");
    await query("DELETE FROM users WHERE email LIKE '%@test-rollout.app'");

  } catch (err) {
    console.error('Scheduler Test Error:', err);
    failed++;
  }

  console.log(`\n📊 Scheduler & Expiry Test Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

testBetaRolloutScheduler();
