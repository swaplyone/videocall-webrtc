import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool, { query } from './db.js';

// Override port before importing server.js to run inline server on 5999
process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runApiTests() {
  console.log('Starting Swaply Friend API Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `api_user_a_${Date.now()}`;
  const userB = `api_user_b_${Date.now()}`;
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
      [`sec_api_a_${Date.now()}`, 'Api User A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_api_b_${Date.now()}`, 'Api User B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userB}`]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // Cleanup previous relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);

    // --- Check 1: Send request ---
    console.log('--- Check 1: Send Friend Request ---');
    const sendRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ target: userB })
    });
    assert.strictEqual(sendRes.status, 200, 'Send request should succeed');
    const sendData = await sendRes.json();
    assert.ok(sendData.success, 'Send must return success: true');
    const reqId = sendData.requestId;
    console.log(`✅ Request sent successfully (ID: ${reqId})`);

    // --- Check 2: Get Pending Requests ---
    console.log('\n--- Check 2: List Pending Requests ---');
    const listRes = await fetch(`${BACKEND_URL}/api/friends/requests`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(listRes.status, 200, 'List requests should succeed');
    const listData = await listRes.json();
    assert.ok(listData.incoming.length >= 1, 'Incoming list should contain the request');
    assert.strictEqual(listData.incoming[0].id, reqId, 'Request ID should match');
    console.log('✅ List incoming pending requests verified');

    // --- Check 3: Accept Request ---
    console.log('\n--- Check 3: Accept Friend Request ---');
    const acceptRes = await fetch(`${BACKEND_URL}/api/friends/request/${reqId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(acceptRes.status, 200, 'Accept request should succeed');
    console.log('✅ Friend request accepted successfully');

    // --- Check 4: Get Friends list ---
    console.log('\n--- Check 4: Verify Friends List ---');
    const friendsRes = await fetch(`${BACKEND_URL}/api/friends`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(friendsRes.status, 200, 'Get friends should succeed');
    const friendsData = await friendsRes.json();
    assert.ok(friendsData.friends.length >= 1, 'Friends list should contain B');
    assert.strictEqual(friendsData.friends[0].username, userB, 'Friend username must be B');
    console.log('✅ Bidirectional friendship verified');

    // --- Check 5: Remove Friend ---
    console.log('\n--- Check 5: Remove Friend ---');
    const removeRes = await fetch(`${BACKEND_URL}/api/friends/${idB}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(removeRes.status, 200, 'Remove friend should succeed');
    
    const verifyRes = await fetch(`${BACKEND_URL}/api/friends`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.friends.length, 0, 'Friends list must be empty after removal');
    console.log('✅ Friendship terminated successfully');

    // Clean DB
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ API tests encountered error:', err);
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
  console.log(`Friend API Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runApiTests();
