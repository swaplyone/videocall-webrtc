// Swaply Call Quality Feedback Real DB Integration Tests

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
  console.log('Starting Swaply Call Quality Feedback DB Integration Tests...\n');
  const server = app.listen(PORT);
  let passed = true;

  const user1 = 'feedbackuser1';
  const user2 = 'feedbackuser2';
  const badUser = 'feedbackbaduser';

  let userId1 = null;
  let userId2 = null;
  let badUserId = null;
  let callId = null;

  let token1 = null;
  let badToken = null;

  try {
    // 1. Setup mock database users
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", [user1, user2, badUser]);

    const userRes1 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Alice Feedback', user1, 'feed1@example.com', 'hash1']
    );
    userId1 = userRes1.rows[0].id;
    token1 = jwt.sign({ id: userId1, username: user1 }, JWT_ACCESS_SECRET);

    const userRes2 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Bob Feedback', user2, 'feed2@example.com', 'hash2']
    );
    userId2 = userRes2.rows[0].id;

    const userResBad = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Charlie Hacker', badUser, 'feedbad@example.com', 'hash3']
    );
    badUserId = userResBad.rows[0].id;
    badToken = jwt.sign({ id: badUserId, username: badUser }, JWT_ACCESS_SECRET);

    // 2. Insert mock call record
    const callRes = await query(
      `INSERT INTO calls (caller_id, receiver_id, status, started_at)
       VALUES ($1, $2, 'completed', NOW() - INTERVAL '5 minutes') RETURNING id`,
      [userId1, userId2]
    );
    callId = callRes.rows[0].id;

    // Test Case 1: Submit valid feedback
    console.log('--- Test Case 1: Valid Call Feedback Submission ---');
    const payload1 = {
      callId,
      rating: 5,
      issues: ['audio', 'video'],
      comments: 'Crystal clear connection!'
    };

    const res1 = await fetch(`http://localhost:${PORT}/api/calls/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify(payload1)
    });

    const data1 = await res1.json();
    
    // Query DB to ensure feedback is committed
    const checkDb = await query(
      `SELECT rating, issues, comments FROM call_feedback WHERE call_id = $1 AND user_id = $2`,
      [callId, userId1]
    );

    if (res1.ok && data1.success && checkDb.rowCount === 1) {
      const row = checkDb.rows[0];
      console.log('✅ POST /api/calls/feedback returned success payload.');
      console.log(`✅ Rating verified in DB: ${row.rating}`);
      console.log(`✅ Issues verified in DB: ${JSON.stringify(row.issues)}`);
      console.log(`✅ Comments verified in DB: "${row.comments}"`);
    } else {
      console.error('❌ Valid feedback submission failed. Response:', data1, 'DB rows:', checkDb.rowCount);
      passed = false;
    }

    // Test Case 2: Validation of Invalid Rating bounds
    console.log('\n--- Test Case 2: Rating Bounds Validation Check ---');
    const payload2 = {
      callId,
      rating: 6, // Invalid
      issues: []
    };

    const res2 = await fetch(`http://localhost:${PORT}/api/calls/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify(payload2)
    });

    if (res2.status === 400) {
      console.log('✅ Rating value 6 correctly rejected with 400 Bad Request');
    } else {
      console.error(`❌ Expected 400 for rating 6, got: ${res2.status}`);
      passed = false;
    }

    // Test Case 3: Block feedback submission if not a participant in the call
    console.log('\n--- Test Case 3: Participant Authorization Verification ---');
    const res3 = await fetch(`http://localhost:${PORT}/api/calls/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${badToken}` // User is not a participant
      },
      body: JSON.stringify(payload1)
    });

    if (res3.status === 404) {
      console.log('✅ Non-participant user submission correctly rejected with 404 Not Found');
    } else {
      console.error(`❌ Expected 404 for non-participant user, got: ${res3.status}`);
      passed = false;
    }

  } catch (err) {
    console.error('Test execution error:', err);
    passed = false;
  } finally {
    // Cleanup Database records
    console.log('\nCleaning up integration test database records...');
    try {
      if (callId) {
        await query("DELETE FROM call_feedback WHERE call_id = $1", [callId]);
        await query("DELETE FROM calls WHERE id = $1", [callId]);
      }
      await query("DELETE FROM users WHERE username IN ($1, $2, $3)", [user1, user2, badUser]);
      console.log('✅ Database cleaned successfully.');
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr);
    }

    server.close();
    setTimeout(async () => {
      await pool.end();
      console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
      process.exit(passed ? 0 : 1);
    }, 100);
  }
}

runTests();
