// Swaply Call History Filters and Telemetry Integration Tests

import express from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import callRoutes from './routes/callRoutes.js';

const app = express();
app.use(express.json());

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

app.use('/api/calls', callRoutes);

async function runTests() {
  console.log('Starting Swaply Call History Logs & Telemetry Filters Tests...\n');
  const server = app.listen(PORT);
  let passed = true;

  const user1 = 'historyuser1';
  const user2 = 'historyuser2';
  const user3 = 'historyuser3';

  let userId1 = null;
  let userId2 = null;
  let userId3 = null;

  let token1 = null;

  try {
    // 1. Setup mock database users
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", [user1, user2, user3]);

    const userRes1 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Alice History', user1, 'hist1@example.com', 'hash1']
    );
    userId1 = userRes1.rows[0].id;
    token1 = jwt.sign({ id: userId1, username: user1 }, JWT_ACCESS_SECRET);

    const userRes2 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Bob History', user2, 'hist2@example.com', 'hash2']
    );
    userId2 = userRes2.rows[0].id;

    const userRes3 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Charlie History', user3, 'hist3@example.com', 'hash3']
    );
    userId3 = userRes3.rows[0].id;

    // 2. Insert mock call logs
    // Call 1: Outgoing completed call from User 1 to User 2
    const callRes1 = await query(
      `INSERT INTO calls (caller_id, receiver_id, status, duration, started_at)
       VALUES ($1, $2, 'completed', 120, NOW() - INTERVAL '10 minutes') RETURNING id`,
      [userId1, userId2]
    );
    const callId1 = callRes1.rows[0].id;

    // Submit rating 5 (Excellent) for Call 1
    await query(
      `INSERT INTO call_feedback (call_id, user_id, rating, issues, comments)
       VALUES ($1, $2, 5, $3, $4)`,
      [callId1, userId1, ['audio'], 'Excellent call!']
    );

    // Call 2: Incoming completed call to User 1 from User 2
    const callRes2 = await query(
      `INSERT INTO calls (caller_id, receiver_id, status, duration, started_at)
       VALUES ($1, $2, 'completed', 45, NOW() - INTERVAL '8 minutes') RETURNING id`,
      [userId2, userId1]
    );
    const callId2 = callRes2.rows[0].id;

    // Submit rating 3 (Fair) for Call 2
    await query(
      `INSERT INTO call_feedback (call_id, user_id, rating, issues, comments)
       VALUES ($1, $2, 3, $3, $4)`,
      [callId2, userId1, ['video'], 'Fair quality.']
    );

    // Call 3: Outgoing rejected call from User 1 to User 3
    await query(
      `INSERT INTO calls (caller_id, receiver_id, status, duration, started_at)
       VALUES ($1, $2, 'rejected', 0, NOW() - INTERVAL '5 minutes')`,
      [userId1, userId3]
    );

    // Call 4: Incoming missed call to User 1 from User 3
    await query(
      `INSERT INTO calls (caller_id, receiver_id, status, duration, started_at)
       VALUES ($1, $2, 'missed', 0, NOW() - INTERVAL '2 minutes')`,
      [userId3, userId1]
    );

    // Run test requests
    // Test Case 1: Fetch all call history (No filters)
    console.log('--- Test Case 1: Fetch All Call History (No Filters) ---');
    const res1 = await fetch(`http://localhost:${PORT}/api/calls/history`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data1 = await res1.json();
    if (res1.ok && data1.success && data1.calls.length === 4) {
      console.log('✅ Correctly fetched all 4 call history records.');
      console.log(`✅ Rating 5 quality tag resolved to: ${data1.calls[3].quality_tag}`); // Excellent (ordered by started_at DESC, so Call 1 is last!)
      console.log(`✅ Rating 3 quality tag resolved to: ${data1.calls[2].quality_tag}`); // Fair
      console.log(`✅ Missed/Rejected quality tag resolved to: ${data1.calls[0].quality_tag}`); // Unrated
    } else {
      console.error('❌ Test Case 1 FAILED:', data1);
      passed = false;
    }

    // Test Case 2: Filter Incoming Calls
    console.log('\n--- Test Case 2: Filter Incoming Calls ---');
    const res2 = await fetch(`http://localhost:${PORT}/api/calls/history?type=incoming`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data2 = await res2.json();
    const allIncoming = data2.calls.every(c => !c.is_caller);
    if (res2.ok && data2.success && data2.calls.length === 2 && allIncoming) {
      console.log('✅ Correctly filtered and returned 2 incoming calls.');
    } else {
      console.error('❌ Test Case 2 FAILED:', data2);
      passed = false;
    }

    // Test Case 3: Filter Outgoing Calls
    console.log('\n--- Test Case 3: Filter Outgoing Calls ---');
    const res3 = await fetch(`http://localhost:${PORT}/api/calls/history?type=outgoing`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data3 = await res3.json();
    const allOutgoing = data3.calls.every(c => c.is_caller);
    if (res3.ok && data3.success && data3.calls.length === 2 && allOutgoing) {
      console.log('✅ Correctly filtered and returned 2 outgoing calls.');
    } else {
      console.error('❌ Test Case 3 FAILED:', data3);
      passed = false;
    }

    // Test Case 4: Filter Missed Calls
    console.log('\n--- Test Case 4: Filter Missed Calls ---');
    const res4 = await fetch(`http://localhost:${PORT}/api/calls/history?type=missed`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data4 = await res4.json();
    const allMissed = data4.calls.every(c => c.status === 'missed');
    if (res4.ok && data4.success && data4.calls.length === 1 && allMissed) {
      console.log('✅ Correctly filtered and returned 1 missed call.');
    } else {
      console.error('❌ Test Case 4 FAILED:', data4);
      passed = false;
    }

    // Test Case 5: Filter Quality Level Excellent
    console.log('\n--- Test Case 5: Filter Quality Level Excellent ---');
    const res5 = await fetch(`http://localhost:${PORT}/api/calls/history?quality=excellent`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data5 = await res5.json();
    if (res5.ok && data5.success && data5.calls.length === 1 && data5.calls[0].quality_tag === 'Excellent') {
      console.log('✅ Correctly filtered and returned 1 Excellent call.');
    } else {
      console.error('❌ Test Case 5 FAILED:', data5);
      passed = false;
    }

    // Test Case 6: Filter Quality Level Fair
    console.log('\n--- Test Case 6: Filter Quality Level Fair ---');
    const res6 = await fetch(`http://localhost:${PORT}/api/calls/history?quality=fair`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data6 = await res6.json();
    if (res6.ok && data6.success && data6.calls.length === 1 && data6.calls[0].quality_tag === 'Fair') {
      console.log('✅ Correctly filtered and returned 1 Fair call.');
    } else {
      console.error('❌ Test Case 6 FAILED:', data6);
      passed = false;
    }

    // Clean up mock database records
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", [user1, user2, user3]);

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
    passed = false;
  } finally {
    server.close();
    pool.end();
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 500);
  }
}

runTests();
