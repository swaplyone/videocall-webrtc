import { query } from './db.js';
import { runDbMigrations } from './db-init.js';
import * as betaRolloutService from './services/betaRolloutService.js';

async function testBetaApi() {
  console.log('🧪 Starting Phase 11 Beta Waitlist API & Slot Tests...');
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
    await query("DELETE FROM beta_waitlist WHERE email LIKE '%@test-beta.app'");
    await query("DELETE FROM users WHERE email LIKE '%@test-beta.app'");

    // Create 3 test users
    const u1 = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
      VALUES ('sec_beta_1', 'Beta User 1', 'beta_user_1', 'u1@test-beta.app', 'hash', 'SWP-BETA1')
      RETURNING *
    `);
    const u2 = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
      VALUES ('sec_beta_2', 'Beta User 2', 'beta_user_2', 'u2@test-beta.app', 'hash', 'SWP-BETA2')
      RETURNING *
    `);
    const u3 = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
      VALUES ('sec_beta_3', 'Beta User 3', 'beta_user_3', 'u3@test-beta.app', 'hash', 'SWP-BETA3')
      RETURNING *
    `);

    // 1. Register User 1
    const reg1 = await betaRolloutService.registerUserForWaitlist({
      userId: u1.rows[0].id,
      username: u1.rows[0].username,
      email: u1.rows[0].email,
      betaId: u1.rows[0].beta_id
    });
    assert(reg1.user_id === u1.rows[0].id, 'User 1 registered for waitlist');
    assert(reg1.rollout_status === 'READY_FOR_ROLLOUT' || reg1.rollout_status === 'WAITING_QUEUE', 'Status assigned to user 1');

    // 2. Register User 2 & User 3
    await betaRolloutService.registerUserForWaitlist({
      userId: u2.rows[0].id,
      username: u2.rows[0].username,
      email: u2.rows[0].email,
      betaId: u2.rows[0].beta_id
    });
    await betaRolloutService.registerUserForWaitlist({
      userId: u3.rows[0].id,
      username: u3.rows[0].username,
      email: u3.rows[0].email,
      betaId: u3.rows[0].beta_id
    });

    const listRes = await query("SELECT * FROM beta_waitlist WHERE email LIKE '%@test-beta.app' ORDER BY waitlist_position ASC");
    assert(listRes.rowCount === 3, 'All 3 test users present in waitlist table');
    assert(listRes.rows[0].waitlist_position === 1, 'First registered user has waitlist_position 1');
    assert(listRes.rows[1].waitlist_position === 2, 'Second registered user has waitlist_position 2');
    assert(listRes.rows[2].waitlist_position === 3, 'Third registered user has waitlist_position 3');

    // 3. Issue invitation pass to User 1
    const inv1 = await betaRolloutService.sendBetaInvitationToUser(listRes.rows[0].id, 'Test admin invite');
    assert(inv1.rollout_status === 'INVITED', 'User 1 status updated to INVITED');
    assert(inv1.activation_code.startsWith('ACT-'), 'Unique activation code generated');

    // 4. User 1 activates beta
    const act1 = await betaRolloutService.activateBetaUser({ userId: u1.rows[0].id, activationCode: inv1.activation_code });
    assert(act1.rollout_status === 'ACCEPTED', 'User 1 status updated to ACCEPTED');

    // 5. User 2 cancels registration
    await betaRolloutService.cancelWaitlistRegistration(u2.rows[0].id);
    const afterCancelRes = await query("SELECT * FROM beta_waitlist WHERE email LIKE '%@test-beta.app' ORDER BY registration_timestamp ASC");
    const u3Entry = afterCancelRes.rows.find(r => r.user_id === u3.rows[0].id);
    assert(u3Entry.waitlist_position === 1 || u3Entry.waitlist_position === 2, 'Waitlist positions recalculated after cancellation');

    // Cleanup
    await query("DELETE FROM beta_waitlist WHERE email LIKE '%@test-beta.app'");
    await query("DELETE FROM users WHERE email LIKE '%@test-beta.app'");

  } catch (err) {
    console.error('API Test Error:', err);
    failed++;
  }

  console.log(`\n📊 API Integration Test Summary: ${passed} Passed, ${failed} Failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

testBetaApi();
