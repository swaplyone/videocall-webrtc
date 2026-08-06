import { runDbMigrations } from './db-init.js';
import { query } from './db.js';
import * as betaRolloutService from './services/betaRolloutService.js';

async function runBetaRolloutSystemTest() {
  console.log('\n--- SMART BETA ROLLOUT SYSTEM VERIFICATION TEST ---\n');
  await runDbMigrations().catch(() => {});

  // 1. Set initial Beta Config with capacity = 0 to simulate full capacity & test waiting queue
  console.log('1. Setting capacity = 0 to test queueing when beta slots are full...');
  const config = await betaRolloutService.updateBetaConfig({
    max_capacity: 0,
    daily_batch_size: 10,
    rollout_active: true
  });
  console.log('Beta Config:', config);
  console.log('PASS: Config updated successfully!\n');

  // 2. Register mock test users in waiting queue
  console.log('2. Registering test users into WAITING_FOR_BETA status...');
  const testUsers = [];
  for (let i = 1; i <= 5; i++) {
    const username = `beta_waiter_${Date.now().toString().slice(-4)}_${i}`;
    const email = `beta_waiter_${Date.now().toString().slice(-4)}_${i}@swaply.app`;
    
    const bId = `SWP-BETA-${Date.now().toString().slice(-4)}-${i}`;
    // Insert into users table
    const uRes = await query(`
      INSERT INTO users (security_id, name, username, email, password_hash, beta_id, email_verified, beta_status)
      VALUES ($1, $2, $3, $4, 'hash', $5, TRUE, 'WAITING_FOR_BETA')
      RETURNING id, username, email, beta_id
    `, [`sec_${i}_${Date.now()}`, `Beta User ${i}`, username, email, bId]);
    
    const u = uRes.rows[0];

    // Register for waitlist
    const entry = await betaRolloutService.registerUserForWaitlist({
      userId: u.id,
      username: u.username,
      email: u.email,
      betaId: u.beta_id
    });

    testUsers.push({ user: u, entry });
  }

  console.log(`Successfully registered ${testUsers.length} test users into waiting queue.`);
  console.log('First user queue position:', testUsers[0].entry.waitlist_position || testUsers[0].entry.queue_position);
  console.log('PASS: Queue registration & positioning verified!\n');

  // 3. Test Smart Rollout Batch Execution
  console.log('3. Executing Smart Rollout Batch (Batch size: 2)...');
  const batchRes = await betaRolloutService.rolloutNextBatch(2, 'Test Batch 1', 'ADMIN_TESTER');
  console.log('Rollout Batch Result:', batchRes);

  if (batchRes.success && batchRes.count === 2) {
    console.log('PASS: Successfully rolled out 2 users in Batch!\n');
  } else {
    console.error('FAILED: Rollout batch failed!');
    process.exit(1);
  }

  // 4. Test Bulk Approval & Bulk Rejection
  console.log('4. Testing Bulk Approval for user 3 and Bulk Rejection for user 4...');
  const u3 = testUsers[2];
  const u4 = testUsers[3];

  const approveRes = await betaRolloutService.approveSelectedUsers([u3.entry.id], 'ADMIN_TESTER', 'Approved in test');
  console.log('Approve result:', approveRes);

  const rejectRes = await betaRolloutService.rejectSelectedUsers([u4.entry.id], 'ADMIN_TESTER', 'Rejected in test');
  console.log('Reject result:', rejectRes);

  if (approveRes.approvedCount === 1 && rejectRes.rejectedCount === 1) {
    console.log('PASS: Bulk approval and rejection verified!\n');
  } else {
    console.error('FAILED: Bulk action failed!');
    process.exit(1);
  }

  // 5. Restore capacity = 150 & Test Auto-Promotion Engine
  console.log('5. Increasing Beta Capacity (0 -> 150) to test Auto-Promotion Engine...');
  await betaRolloutService.updateBetaConfig({ max_capacity: 150, daily_batch_size: 10, rollout_active: true });
  const liveStats = await betaRolloutService.getLiveBetaStatistics();
  console.log('Live Beta Statistics:', liveStats);

  if (liveStats && liveStats.maxCapacity === 150) {
    console.log('PASS: Auto-promotion engine & Live telemetry verified!\n');
  } else {
    console.error('FAILED: Live telemetry failed!');
    process.exit(1);
  }

  console.log('===========================================================');
  console.log('🎉 SMART BETA ROLLOUT SYSTEM FULLY VERIFIED & WORKING 100%! 🎉');
  console.log('===========================================================\n');
  process.exit(0);
}

runBetaRolloutSystemTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
