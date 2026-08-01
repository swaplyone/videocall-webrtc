import assert from 'assert';
import { query } from './db.js';
import pool from './db.js';

async function runPiPTests() {
  console.log('Starting Swaply Picture-in-Picture Telemetry Tests...');
  let passed = true;

  try {
    await query('DELETE FROM privacy_events');
    await query('DELETE FROM calls');
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['pip_tester', 'pip_peer']);

    // Seed users
    const userRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
      ['sec_pip_1', 'PiP Tester', 'pip_tester', 'pip@swaply.app', 'hash123']
    );
    const userId = userRes.rows[0].id;

    const peerRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
      ['sec_pip_2', 'PiP Peer', 'pip_peer', 'peer@swaply.app', 'hash123']
    );
    const peerId = peerRes.rows[0].id;

    // Seed a call
    const callRes = await query(
      `INSERT INTO calls (caller_id, receiver_id, status, session_id, started_at)
       VALUES ($1, $2, 'active', $3, NOW()) RETURNING id`,
      [userId, peerId, 'session_pip_123']
    );
    const callId = callRes.rows[0].id;

    // 1. Log PiP Activation (Module 27, 29)
    const metadata = { subType: 'pip_activated' };
    const insertRes = await query(
      `INSERT INTO privacy_events (event_type, user_id, call_id, target_user_id, beta_id_snapshot, severity, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      ['capture_risk', userId, callId, peerId, 'SWP-BETA', 'warning', 'NEW', JSON.stringify(metadata)]
    );
    assert.ok(insertRes.rows[0].id);
    console.log('✅ Log PiP activation event successfully: SUCCESS');

    // 2. Query and verify PiP status is visible in the event log (Module 29, 31)
    const selectRes = await query('SELECT * FROM privacy_events WHERE id = $1', [insertRes.rows[0].id]);
    assert.strictEqual(selectRes.rowCount, 1);
    
    const loggedEvent = selectRes.rows[0];
    assert.strictEqual(loggedEvent.event_type, 'capture_risk');
    assert.strictEqual(loggedEvent.metadata.subType, 'pip_activated');
    console.log('✅ Verify PiP metadata payload: SUCCESS');

  } catch (err) {
    console.error('❌ PiP Telemetry Tests failed:', err.message);
    passed = false;
  } finally {
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`PiP Telemetry Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runPiPTests();
