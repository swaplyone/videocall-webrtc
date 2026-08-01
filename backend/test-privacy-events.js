import pg from 'pg';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import express from 'express';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import privacyRoutes from './routes/privacyRoutes.js';

const { Client } = pg;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const TEST_PORT = 5999;

async function runEventsTest() {
  console.log('Starting Swaply Privacy Events Endpoint Tests...');
  let serverInstance = null;
  let passed = true;

  try {
    // 1. Start Server inline on port 5999
    const app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);

    serverInstance = app.listen(TEST_PORT);

    // 2. Clear and seed mock users and calls
    await query('DELETE FROM privacy_events');
    await query('DELETE FROM friendships');
    await query('DELETE FROM calls');
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['alice', 'bob']);

    const userARes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, online_status, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Alice', 'alice', 'alice@swaply.com', 'password123', 'SWP-ALICE', true, 'online']
    );
    const userAId = userARes.rows[0].id;

    const userBRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, online_status, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Bob', 'bob', 'bob@swaply.com', 'password123', 'SWP-BOB', true, 'online']
    );
    const userBId = userBRes.rows[0].id;

    // Create friendship (Module 17 integration check)
    await query("INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)", [userAId, userBId]);

    // Create a mock call in calls table
    const callSessionId = 'session_test_privacy_events';
    const callRes = await query(
      "INSERT INTO calls (caller_id, receiver_id, session_id, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
      [userAId, userBId, callSessionId]
    );

    // Generate JWT token for Alice
    const token = jwt.sign({ id: userAId, username: 'alice' }, JWT_SECRET);

    // 3. Post a valid privacy event (Module 5 validation)
    const postRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        eventType: 'screenshot_attempt',
        callId: callSessionId,
        browser: 'Chrome',
        platform: 'Win32',
        metadata: { source: 'PrintScreen Key' }
      })
    });

    const body = await postRes.json();
    if (postRes.status !== 200 || !body.success) {
      throw new Error(`Failed to log privacy event: ${JSON.stringify(body)}`);
    }

    console.log('✅ Privacy event logged successfully through API.');

    // 4. Verify DB entry exists
    const dbCheck = await query('SELECT * FROM privacy_events WHERE user_id = $1', [userAId]);
    if (dbCheck.rowCount !== 1) {
      throw new Error('Database insertion verified: FAILED');
    }
    console.log('✅ Verified privacy event exists in database with matching metadata.');

  } catch (err) {
    console.error('❌ Privacy Events Test failed:', err.message);
    passed = false;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Events API Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runEventsTest();
