import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runBlockingTests() {
  console.log('Starting Swaply Friend Blocking Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `block_user_a_${Date.now()}`;
  const userB = `block_user_b_${Date.now()}`;
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
      [`sec_block_a_${Date.now()}`, 'Block A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_block_b_${Date.now()}`, 'Block B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userB}`]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // Cleanup previous relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);

    // Establish friendship
    await query(
      `INSERT INTO friendships (user_id, friend_id) VALUES (LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))`,
      [idA, idB]
    );

    // --- Check 1: Block User ---
    console.log('--- Check 1: User A blocks User B ---');
    const blockRes = await fetch(`${BACKEND_URL}/api/users/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ username: userB })
    });
    assert.strictEqual(blockRes.status, 200, 'Block request should succeed');
    console.log('✅ Block request completed successfully');

    // --- Check 2: Friendship terminated check ---
    console.log('\n--- Check 2: Verify friendship deleted ---');
    const checkFriends = await query(
      'SELECT 1 FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [idA, idB]
    );
    assert.strictEqual(checkFriends.rowCount, 0, 'Friendship must be deleted upon block');
    console.log('✅ Friendship correctly terminated in database');

    // --- Check 3: Prevent call check ---
    console.log('\n--- Check 3: Verify caller blocks call ---');
    const socketA = Client(BACKEND_URL, { auth: { token: tokenA }, forceNew: true });
    const socketB = Client(BACKEND_URL, { auth: { token: tokenB }, forceNew: true });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { if (++count === 2) resolve(); };
      socketA.on('connect', done);
      socketB.on('connect', done);
    });

    await new Promise((resolve) => {
      socketA.emit('register', userA, () => {
        socketB.emit('register', userB, () => resolve());
      });
    });

    const failCallRes = await new Promise((resolve) => {
      socketA.emit('initiate_call', { to: userB }, (response) => {
        resolve(response);
      });
    });
    assert.strictEqual(failCallRes.success, false, 'Call must be blocked');
    console.log('✅ Verified call correctly blocked post-blocking');

    socketA.disconnect();
    socketB.disconnect();

    // Clean DB
    await query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_user_id = $2', [idA, idB]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ Blocking tests encountered error:', err);
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
  console.log(`Friend Blocking Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runBlockingTests();
