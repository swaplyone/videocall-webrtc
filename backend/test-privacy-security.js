import pg from 'pg';
import jwt from 'jsonwebtoken';
import express from 'express';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import privacyRoutes from './routes/privacyRoutes.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const TEST_PORT = 5999;

async function runSecurityTest() {
  console.log('Starting Swaply Privacy Security & Anti-Spoofing Tests...');
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
    await query('DELETE FROM users WHERE username IN ($1, $2, $3)', ['alice', 'bob', 'charlie']);

    const userARes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [`sec_${randomUUID()}`, 'Alice', 'alice', 'alice@swaply.com', 'password123', 'SWP-ALICE', true]
    );
    const userAId = userARes.rows[0].id;

    const userBRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [`sec_${randomUUID()}`, 'Bob', 'bob', 'bob@swaply.com', 'password123', 'SWP-BOB', true]
    );
    const userBId = userBRes.rows[0].id;

    const userCRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [`sec_${randomUUID()}`, 'Charlie', 'charlie', 'charlie@swaply.com', 'password123', 'SWP-CHARLIE', true]
    );
    const userCId = userCRes.rows[0].id;

    // Create a call between Bob and Charlie (Alice is NOT a participant)
    const callSessionId = 'session_security_spoof_test';
    await query(
      "INSERT INTO calls (caller_id, receiver_id, session_id, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
      [userBId, userCId, callSessionId]
    );

    // Alice generates a token for herself
    const token = jwt.sign({ id: userAId, username: 'alice' }, JWT_SECRET);

    // Alice attempts to log a privacy event for a call she is NOT part of
    const spoofRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/events`, {
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

    if (spoofRes.status !== 403) {
      throw new Error(`Expected status 403 Forbidden for non-participant spoof request, got ${spoofRes.status}`);
    }
    console.log('✅ Access denied for spoofed call session log attempts: SUCCESS');

  } catch (err) {
    console.error('❌ Anti-Spoofing test failed:', err.message);
    passed = false;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Anti-Spoofing Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runSecurityTest();
