import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runSafetyTests() {
  console.log('Starting Swaply Friend Request Safety Edge-Case Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `safe_user_a_${Date.now()}`;
  const userB = `safe_user_b_${Date.now()}`;
  let idA, idB;
  let tokenA, tokenB;

  try {
    console.log('📡 Starting backend server inline on port 5999...');
    const serverModule = await import('./server.js');
    serverInstance = serverModule.httpServer;
    await new Promise(r => setTimeout(r, 1500));

    // 1. Setup mock users
    await query('DELETE FROM users WHERE username IN ($1, $2)', [userA, userB]);
    
    const resA = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_safe_a_${Date.now()}`, 'Safe A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_safe_b_${Date.now()}`, 'Safe B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userB}`]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // Cleanup previous relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM blocks WHERE blocker_id IN ($1, $2) OR blocked_user_id IN ($1, $2)', [idA, idB]);

    // --- Check 1: Self friend request ---
    console.log('--- Check 1: Self Friend Request (Must fail 400) ---');
    const selfRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ target: userA })
    });
    assert.strictEqual(selfRes.status, 400, 'Self request should fail');
    console.log('✅ Correctly blocked self request');

    // --- Check 2: Block relationship restrictions ---
    console.log('\n--- Check 2: Request between blocker/blocked (Must fail 403) ---');
    // A blocks B
    await query('INSERT INTO blocks (blocker_id, blocked_user_id) VALUES ($1, $2)', [idA, idB]);

    // B tries to request A
    const blockedRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ target: userA })
    });
    assert.strictEqual(blockedRes.status, 403, 'Blocked request should be forbidden');
    console.log('✅ Correctly blocked request from blocked user');

    // Remove block
    await query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_user_id = $2', [idA, idB]);

    // --- Check 3: Request to already-friend ---
    console.log('\n--- Check 3: Request to already-friend (Must fail 400) ---');
    // Establish friendship
    await query(
      `INSERT INTO friendships (user_id, friend_id) VALUES (LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))`,
      [idA, idB]
    );

    const friendRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ target: userB })
    });
    assert.strictEqual(friendRes.status, 400, 'Friend request to friend should fail');
    console.log('✅ Correctly blocked request to existing friend');

    // Delete friendship
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);

    // --- Check 4: Double acceptance of request ---
    console.log('\n--- Check 4: Double accept of request (Must fail second time 400) ---');
    // Send request A -> B
    const sendRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ target: userB })
    });
    const sendData = await sendRes.json();
    const reqId = sendData.requestId;

    // Accept once
    const accept1 = await fetch(`${BACKEND_URL}/api/friends/request/${reqId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(accept1.status, 200, 'First accept must succeed');

    // Accept twice
    const accept2 = await fetch(`${BACKEND_URL}/api/friends/request/${reqId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(accept2.status, 400, 'Second accept must fail');
    console.log('✅ Correctly blocked duplicate request acceptance');

    // Clean DB
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ Safety tests encountered error:', err);
    passed = false;
  }

  if (serverInstance) {
    console.log('\n🧹 Cleaning up inline backend server...');
    await new Promise((resolve) => {
      serverInstance.close(async () => {
        try {
          await pool.end();
        } catch (dbErr) {
          console.warn('Error closing database pool:', dbErr.message);
        }
        resolve();
      });
    });
  }

  console.log('\n==================================================');
  console.log(`Friend Safety Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runSafetyTests();
