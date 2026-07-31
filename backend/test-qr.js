import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runQrTests() {
  console.log('Starting Swaply QR Connection Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `qr_user_a_${Date.now()}`;
  const userB = `qr_user_b_${Date.now()}`;
  let idA, idB;
  let tokenA, tokenB;
  let qrTokenB;

  try {
    console.log('📡 Starting backend server inline on port 5999...');
    const serverModule = await import('./server.js');
    serverInstance = serverModule.httpServer;
    await new Promise(r => setTimeout(r, 1500));

    // 1. Setup mock users
    await query('DELETE FROM users WHERE username IN ($1, $2)', [userA, userB]);
    
    qrTokenB = `qr_tok_b_${Date.now()}`;
    const resA = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_qr_a_${Date.now()}`, 'QR User A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_tok_a_${Date.now()}`]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, qr_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [`sec_qr_b_${Date.now()}`, 'QR User B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, qrTokenB, true]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // Cleanup previous relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);

    // --- Check 1: Fetch own QR token details ---
    console.log('--- Check 1: Fetch Own QR Token & Invite URL ---');
    const qrGetRes = await fetch(`${BACKEND_URL}/api/friends/qr`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(qrGetRes.status, 200, 'Fetch QR should succeed');
    const qrGetData = await qrGetRes.json();
    assert.strictEqual(qrGetData.qr_token, qrTokenB, 'Fetched QR token should match');
    assert.strictEqual(qrGetData.inviteUrl, `swaply://friend/${qrTokenB}`, 'Invite URL format must match');
    console.log('✅ Fetched active QR invite URL format successfully');

    // --- Check 2: Resolve B\'s token from A ---
    console.log('\n--- Check 2: Resolve target profile from token ---');
    const resolveRes = await fetch(`${BACKEND_URL}/api/friends/qr/resolve/${qrTokenB}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(resolveRes.status, 200, 'Token resolution should succeed');
    const resolveData = await resolveRes.json();
    assert.strictEqual(resolveData.user.username, userB, 'Resolved user must be user B');
    assert.strictEqual(resolveData.user.email, undefined, 'Must not expose email address');
    assert.strictEqual(resolveData.user.security_id, undefined, 'Must not expose security ID');
    console.log('✅ Resolved profile details safely from token');

    // --- Check 3: Send Friend Request using resolved profile ---
    console.log('\n--- Check 3: Request Friend after QR resolution ---');
    const requestRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ target: resolveData.user.username })
    });
    assert.strictEqual(requestRes.status, 200, 'Request should succeed');
    const reqData = await requestRes.json();
    assert.ok(reqData.success, 'Request should return success');
    
    // Assert in database that friendship is NOT created yet (only pending request)
    const checkFriends = await query(
      'SELECT 1 FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [idA, idB]
    );
    assert.strictEqual(checkFriends.rowCount, 0, 'Scan QR must NOT automatically create a friendship');
    console.log('✅ Verified request successfully created without automatic friendship side effects');

    // --- Check 4: Blocked/Inactive QR token resolution ---
    console.log('\n--- Check 4: Deactivated QR Token check ---');
    // Disable QR sharing for B
    await query('UPDATE users SET qr_active = false WHERE id = $1', [idB]);

    const resolveResFail = await fetch(`${BACKEND_URL}/api/friends/qr/resolve/${qrTokenB}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(resolveResFail.status, 403, 'Resolved deactivated token must be forbidden');
    console.log('✅ Deactivated QR invite token correctly rejected');

    // Clean DB
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ QR tests encountered error:', err);
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
  console.log(`QR Invite Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runQrTests();
