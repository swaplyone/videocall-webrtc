import pg from 'pg';
import jwt from 'jsonwebtoken';
import express from 'express';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import privacyRoutes from './routes/privacyRoutes.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const TEST_PORT = 5999;

async function runRateLimitTest() {
  console.log('Starting Swaply Privacy Events Rate Limit Tests...');
  let serverInstance = null;
  let passed = true;

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);

    serverInstance = app.listen(TEST_PORT);

    // Seed mock data
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

    const callSessionId = 'session_rate_limit_test';
    const callRes = await query(
      "INSERT INTO calls (caller_id, receiver_id, session_id, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
      [userAId, userBId, callSessionId]
    );

    const token = jwt.sign({ id: userAId, username: 'alice' }, JWT_SECRET);

    // Fire 5 valid events
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventType: 'screenshot_attempt',
          callId: callSessionId,
          browser: 'Chrome',
          platform: 'Win32'
        })
      });
      if (res.status !== 200) {
        throw new Error(`Failed on event insertion index ${i}`);
      }
    }

    console.log('✅ Fire 5 base events: SUCCESS');

    // Fire 6th event (should hit rate limit and trigger 429)
    const limitRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        eventType: 'screenshot_attempt',
        callId: callSessionId,
        browser: 'Chrome',
        platform: 'Win32'
      })
    });

    if (limitRes.status !== 429) {
      throw new Error(`Expected status 429 for rate limit exceed, got ${limitRes.status}`);
    }
    console.log('✅ Rate Limit triggered status 429: SUCCESS');

    // Check if privacy_event_rate_limited is logged in DB (Module 6)
    const dbCheck = await query(
      "SELECT 1 FROM privacy_events WHERE user_id = $1 AND event_type = 'privacy_event_rate_limited'",
      [userAId]
    );
    if (dbCheck.rowCount === 0) {
      throw new Error("No rate limited audit entry found in database");
    }
    console.log("✅ Verified 'privacy_event_rate_limited' logged in safety index.");

  } catch (err) {
    console.error('❌ Rate Limit test failed:', err.message);
    passed = false;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Rate Limiter Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runRateLimitTest();
