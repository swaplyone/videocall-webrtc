import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import pool from './db.js';

const TEST_PORT = 5006;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runQRValidationTests() {
  console.log('Starting Swaply QR Validation & Security Tests...');
  let passed = true;

  const { default: express } = await import('express');
  const app = express();
  app.use(express.json());
  
  const { default: friendRoutes } = await import('./routes/friendRoutes.js');
  app.use('/api/friends', friendRoutes);

  const server = app.listen(TEST_PORT);

  try {
    await query('DELETE FROM friendships');
    await query('DELETE FROM friend_requests');
    await query('DELETE FROM blocks');
    await query("DELETE FROM users WHERE username IN ('qr_alice', 'qr_bob')");

    // 1. Seed users with QR tokens (Module 34)
    const aliceRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, email_verified, qr_token, qr_active)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'alice_token_123', TRUE) RETURNING id`,
      ['sec_qr_alice', 'Alice QR', 'qr_alice', 'aliceqr@swaply.app', 'hash123']
    );
    const aliceId = aliceRes.rows[0].id;
    const aliceToken = jwt.sign(
      { id: aliceId, username: 'qr_alice', securityId: 'sec_qr_alice' },
      JWT_SECRET
    );

    const bobRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, email_verified, qr_token, qr_active)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'bob_token_123', TRUE) RETURNING id`,
      ['sec_qr_bob', 'Bob QR', 'qr_bob', 'bobqr@swaply.app', 'hash123']
    );
    const bobId = bobRes.rows[0].id;
    const bobToken = jwt.sign(
      { id: bobId, username: 'qr_bob', securityId: 'sec_qr_bob' },
      JWT_SECRET
    );

    // 2. Resolve QR Token (Module 37)
    const resolveRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/friends/qr/resolve/bob_token_123`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert.strictEqual(resolveRes.status, 200);
    const resolveJson = await resolveRes.json();
    assert.strictEqual(resolveJson.success, true);
    assert.strictEqual(resolveJson.user.username, 'qr_bob');
    console.log('✅ Resolved Bob QR token successfully: SUCCESS');

    // 3. Prevent Self-Scan Friend Request (Module 36, 37)
    const selfRequestRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ target: 'qr_alice' })
    });
    assert.strictEqual(selfRequestRes.status, 400);
    const selfRequestJson = await selfRequestRes.json();
    assert.strictEqual(selfRequestJson.error, 'You cannot send a friend request to yourself');
    console.log('✅ Self friend request blocked successfully: SUCCESS');

    // 4. Send Friend Request (Module 37)
    const reqRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ target: 'qr_bob' })
    });
    assert.strictEqual(reqRes.status, 200);
    console.log('✅ Friend request sent from Alice to Bob: SUCCESS');

    // 5. Blocked user validation (Module 36)
    // Seed block
    await query('INSERT INTO blocks (blocker_id, blocked_user_id) VALUES ($1, $2)', [bobId, aliceId]);
    const blockedReqRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ target: 'qr_bob' })
    });
    // Should be blocked
    assert.strictEqual(blockedReqRes.status, 403);
    const blockedReqJson = await blockedReqRes.json();
    assert.strictEqual(blockedReqJson.error, 'Friend request blocked by privacy relationships');
    console.log('✅ Request blocked due to privacy block relationships: SUCCESS');

  } catch (err) {
    console.error('❌ QR Validation & Security Tests failed:', err.message);
    passed = false;
  } finally {
    server.close();
    await pool.end();
  }
}

runQRValidationTests();
