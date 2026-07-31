import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runPrivacyTests() {
  console.log('Starting Swaply Friend Privacy Controls Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `priv_user_a_${Date.now()}`;
  const userB = `priv_user_b_${Date.now()}`;
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
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, searchable, allow_requests, show_beta_id, qr_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [`sec_priv_a_${Date.now()}`, 'Priv A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`, true, true, true, true]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, searchable, allow_requests, show_beta_id, qr_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [`sec_priv_b_${Date.now()}`, 'Priv B', userB, `${userB}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userB}`, true, true, true, true]
    );
    idB = resB.rows[0].id;
    tokenB = jwt.sign({ id: idB, username: userB }, JWT_ACCESS_SECRET);

    // --- Check 1: Update Privacy Settings ---
    console.log('--- Check 1: Disable allow_requests and searchable ---');
    const updateRes = await fetch(`${BACKEND_URL}/api/friends/privacy`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ searchable: false, allow_requests: false })
    });
    assert.strictEqual(updateRes.status, 200, 'Privacy update should succeed');
    console.log('✅ Privacy update completed successfully');

    // --- Check 2: Retrieve Profile check ---
    console.log('\n--- Check 2: Retrieve profile with updated toggles ---');
    const profileRes = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const profileData = await profileRes.json();
    assert.strictEqual(profileData.user.searchable, false, 'Searchable must be false');
    assert.strictEqual(profileData.user.allow_requests, false, 'allow_requests must be false');
    console.log('✅ Profile returns correct privacy values');

    // --- Check 3: Prevent requests check ---
    console.log('\n--- Check 3: Block incoming friend request when allow_requests=false ---');
    const requestRes = await fetch(`${BACKEND_URL}/api/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ target: userA })
    });
    assert.strictEqual(requestRes.status, 403, 'Request should be rejected with 403');
    console.log('✅ Friend request blocked successfully due to privacy settings');

    // Clean DB
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ Privacy tests encountered error:', err);
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
  console.log(`Friend Privacy Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runPrivacyTests();
