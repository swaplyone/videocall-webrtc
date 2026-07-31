import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runChatSecurityTests() {
  console.log('Starting Swaply Chat Friend-Authorization Security Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `chatsec_user_a_${Date.now()}`;
  const userB = `chatsec_user_b_${Date.now()}`;
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
      [`sec_chatsec_a_${Date.now()}`, 'ChatSec A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_chatsec_b_${Date.now()}`, 'ChatSec B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userB}`]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // Cleanup relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);

    // --- Check 1: Fetch Chat History without friendship (Must fail 403) ---
    console.log('--- Check 1: Fetch chat history between non-friends (Must return 403) ---');
    const histRes = await fetch(`${BACKEND_URL}/api/chat/history/${userB}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(histRes.status, 403, 'Should be blocked with 403');
    console.log('✅ Chat history access correctly forbidden for non-friends');

    // Connect sockets
    socketA = Client(BACKEND_URL, { auth: { token: tokenA }, forceNew: true });
    socketB = Client(BACKEND_URL, { auth: { token: tokenB }, forceNew: true });

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

    // Create friendship and verify chat history allowed
    console.log('\n--- Check 2: Fetch chat history after establishing friendship (Must succeed) ---');
    await query(
      `INSERT INTO friendships (user_id, friend_id) VALUES (LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))`,
      [idA, idB]
    );

    const histSuccessRes = await fetch(`${BACKEND_URL}/api/chat/history/${userB}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(histSuccessRes.status, 200, 'Should load successfully');
    console.log('✅ Chat history allowed for friends');

    // Disconnect sockets
    socketA.disconnect();
    socketB.disconnect();

    // Cleanup
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ Chat security tests encountered error:', err);
    passed = false;
  }

  if (serverInstance) {
    console.log('\n🧹 Cleaning up inline backend server......');
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
  console.log(`Chat Security Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runChatSecurityTests();
