import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runNotificationTests() {
  console.log('Starting Swaply Friend Request Notifications Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `notif_user_a_${Date.now()}`;
  const userB = `notif_user_b_${Date.now()}`;
  let idA, idB;
  let tokenA, tokenB;
  let socketA, socketB;

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
      [`sec_notif_a_${Date.now()}`, 'Notif A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_notif_b_${Date.now()}`, 'Notif B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userB}`]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // Cleanup previous relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);

    // 2. Connect client sockets with JWT auth handshake
    socketA = Client(BACKEND_URL, { auth: { token: tokenA }, forceNew: true });
    socketB = Client(BACKEND_URL, { auth: { token: tokenB }, forceNew: true });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { if (++count === 2) resolve(); };
      socketA.on('connect', done);
      socketB.on('connect', done);
    });

    // Register users online
    await new Promise((resolve) => {
      socketA.emit('register', userA, () => {
        socketB.emit('register', userB, () => resolve());
      });
    });

    console.log('✅ Sockets connected and registered online');

    // --- Check 1: Listen for friend_request_received on B ---
    console.log('\n--- Check 1: Receive Friend Request Notification ---');
    let receivedRequest = null;
    const reqPromise = new Promise((resolve) => {
      socketB.on('friend_request_received', (data) => {
        receivedRequest = data;
        resolve();
      });
    });

    // Send request via REST from A to B
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

    await reqPromise;
    assert.strictEqual(receivedRequest.sender, userA, 'Notification sender should be user A');
    assert.strictEqual(receivedRequest.id, reqId, 'Notification request ID should match');
    console.log('✅ Received real-time friend_request_received notification successfully');

    // --- Check 2: Listen for friend_request_accepted on A ---
    console.log('\n--- Check 2: Accept Friend Request Notification ---');
    let acceptedEvent = null;
    const acceptPromise = new Promise((resolve) => {
      socketA.on('friend_request_accepted', (data) => {
        acceptedEvent = data;
        resolve();
      });
    });

    // Accept request via REST from B
    await fetch(`${BACKEND_URL}/api/friends/request/${reqId}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    await acceptPromise;
    assert.strictEqual(acceptedEvent.receiver, userB, 'Accept notification receiver should be user B');
    console.log('✅ Received real-time friend_request_accepted notification successfully');

    // --- Check 3: Listen for friend_removed on A ---
    console.log('\n--- Check 3: Remove Friend Notification ---');
    let removedEvent = null;
    const removePromise = new Promise((resolve) => {
      socketA.on('friend_removed', (data) => {
        removedEvent = data;
        resolve();
      });
    });

    // Terminate friendship via REST from B
    await fetch(`${BACKEND_URL}/api/friends/${idA}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    await removePromise;
    assert.strictEqual(removedEvent.exFriend, userB, 'Removed notification ex-friend should be user B');
    console.log('✅ Received real-time friend_removed notification successfully');

    // Disconnect sockets
    socketA.disconnect();
    socketB.disconnect();

    // Clean DB
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ Notification tests encountered error:', err);
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
  console.log(`Friend Notifications Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runNotificationTests();
