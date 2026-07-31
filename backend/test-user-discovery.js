import assert from 'assert';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runDiscoveryTests() {
  console.log('Starting Swaply User Discovery & Privacy Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const userA = `disc_user_a_${Date.now()}`;
  const userB = `disc_user_b_${Date.now()}`;
  const userC = `disc_user_c_${Date.now()}`; // Non-searchable user
  let idA, idB, idC;
  let tokenA;
  let betaB, betaC;

  try {
    console.log('📡 Starting backend server inline on port 5999...');
    const serverModule = await import('./server.js');
    serverInstance = serverModule.httpServer;
    await new Promise(r => setTimeout(r, 1500));

    // 1. Setup mock users
    await query('DELETE FROM users WHERE username IN ($1, $2, $3)', [userA, userB, userC]);
    
    const resA = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, searchable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [`sec_disc_a_${Date.now()}`, 'Disc User A', userA, `${userA}@swaply.test`, 'pass', `SWP-${randomUUID().substring(0,5).toUpperCase()}`, `qr_${userA}`, true]
    );
    idA = resA.rows[0].id;
    tokenA = jwt.sign({ id: idA, username: userA }, JWT_ACCESS_SECRET);

    betaB = `SWP-${randomUUID().substring(0,5).toUpperCase()}`;
    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, searchable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [`sec_disc_b_${Date.now()}`, 'Disc User B', userB, `${userB}@swaply.test`, 'pass', betaB, `qr_${userB}`, true]
    );
    idB = resB.rows[0].id;

    betaC = `SWP-${randomUUID().substring(0,5).toUpperCase()}`;
    const resC = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, searchable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [`sec_disc_c_${Date.now()}`, 'Hidden User C', userC, `${userC}@swaply.test`, 'pass', betaC, `qr_${userC}`, false]
    );
    idC = resC.rows[0].id;

    // --- Check 1: Search B by username ---
    console.log('--- Check 1: Search by exact username ---');
    const searchResB = await fetch(`${BACKEND_URL}/api/friends/search?q=${userB}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(searchResB.status, 200, 'Search should succeed');
    const dataB = await searchResB.json();
    assert.strictEqual(dataB.results.length, 1, 'Should find exactly one user');
    assert.strictEqual(dataB.results[0].username, userB, 'Username must match B');
    console.log('✅ Found user B by exact username');

    // --- Check 2: Expose limits check (Verify no sensitive fields) ---
    console.log('\n--- Check 2: Verify No Sensitive Fields Leaked ---');
    const firstResult = dataB.results[0];
    assert.strictEqual(firstResult.email, undefined, 'Email should not be exposed');
    assert.strictEqual(firstResult.password_hash, undefined, 'Password hash should not be exposed');
    assert.strictEqual(firstResult.security_id, undefined, 'Security ID should not be exposed');
    assert.strictEqual(firstResult.id, undefined, 'Database primary ID should not be exposed');
    console.log('✅ Verified results only contain safe public attributes');

    // --- Check 3: Search by Beta ID ---
    console.log('\n--- Check 3: Search by Beta ID ---');
    const searchResBeta = await fetch(`${BACKEND_URL}/api/friends/search?q=${betaB}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(searchResBeta.status, 200, 'Search should succeed');
    const dataBeta = await searchResBeta.json();
    assert.strictEqual(dataBeta.results.length, 1, 'Should find B by Beta ID');
    assert.strictEqual(dataBeta.results[0].beta_id, betaB, 'Beta ID should match');
    console.log('✅ Found user B by exact Beta ID');

    // --- Check 4: Non-searchable user privacy check ---
    console.log('\n--- Check 4: Non-searchable privacy exclusion ---');
    const searchResC = await fetch(`${BACKEND_URL}/api/friends/search?q=Hidden`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const dataC = await searchResC.json();
    const foundC = dataC.results.some(u => u.username === userC);
    assert.strictEqual(foundC, false, 'Hidden user must not appear in fuzzy search results');
    console.log('✅ Non-searchable user successfully excluded from fuzzy query results');

    // Clean DB
    await query('DELETE FROM users WHERE id IN ($1, $2, $3)', [idA, idB, idC]);

  } catch (err) {
    console.error('❌ Discovery tests encountered error:', err);
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
  console.log(`User Discovery Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runDiscoveryTests();
