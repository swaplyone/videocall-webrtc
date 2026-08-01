import pg from 'pg';
import jwt from 'jsonwebtoken';
import express from 'express';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import userRoutes from './routes/userRoutes.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const TEST_PORT = 5999;

async function runBlockingTest() {
  console.log('Starting Swaply Privacy Blocking Integration Tests...');
  let serverInstance = null;
  let passed = true;

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);

    serverInstance = app.listen(TEST_PORT);

    // Seed mock data
    await query('DELETE FROM friendships');
    await query('DELETE FROM calls');
    await query('DELETE FROM blocks');
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['alice', 'bob']);

    const userARes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Alice', 'alice', 'alice@swaply.com', 'password123', 'SWP-ALICE', true]
    );
    const userAId = userARes.rows[0].id;

    const userBRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Bob', 'bob', 'bob@swaply.com', 'password123', 'SWP-BOB', true]
    );
    const userBId = userBRes.rows[0].id;

    // Set up friendship (Module 17)
    await query("INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)", [userAId, userBId]);

    // Set up active call
    const callSessionId = 'session_blocking_test';
    await query(
      "INSERT INTO calls (caller_id, receiver_id, session_id, status) VALUES ($1, $2, $3, 'active') RETURNING id",
      [userAId, userBId, callSessionId]
    );

    const token = jwt.sign({ id: userAId, username: 'alice' }, JWT_SECRET);

    // Alice blocks Bob (Module 12)
    const blockRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/users/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username: 'bob' })
    });

    const body = await blockRes.json();
    if (blockRes.status !== 200 || !body.success) {
      throw new Error(`Failed to block user: ${JSON.stringify(body)}`);
    }

    console.log('✅ Alice successfully blocked Bob.');

    // 1. Verify friendship was removed
    const friendCheck = await query(
      "SELECT 1 FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)",
      [userAId, userBId]
    );
    if (friendCheck.rowCount > 0) {
      throw new Error('Friendship was NOT removed during block');
    }
    console.log('✅ Friendship successfully terminated.');

    // 2. Verify active call was terminated
    const callCheck = await query(
      "SELECT status FROM calls WHERE session_id = $1",
      [callSessionId]
    );
    if (callCheck.rowCount > 0 && callCheck.rows[0].status === 'ACTIVE') {
      throw new Error('Call session was NOT terminated during block');
    }
    console.log('✅ Active WebRTC call session successfully terminated.');

  } catch (err) {
    console.error('❌ Blocking integration test failed:', err.message);
    passed = false;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Blocking Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runBlockingTest();
