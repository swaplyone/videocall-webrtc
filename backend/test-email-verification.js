import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import pool from './db.js';

const TEST_PORT = 5001;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runEmailVerificationTests() {
  console.log('Starting Swaply Email Verification API Tests...');
  let passed = true;

  // Start temporary server
  const { default: express } = await import('express');
  const app = express();
  app.use(express.json());
  
  const { default: authRoutes } = await import('./routes/authRoutes.js');
  app.use('/api/auth', authRoutes);

  const server = app.listen(TEST_PORT);

  try {
    // Clear user
    await query('DELETE FROM email_verification_codes');
    await query('DELETE FROM users WHERE username = $1', ['unverified_tester']);

    // 1. Register unverified user (Default verified status is false)
    const registerRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unverified tester',
        username: 'unverified_tester',
        email: 'unverified@swaply.app',
        password: 'password123'
      })
    });
    const regJson = await registerRes.json();
    assert.strictEqual(registerRes.status, 201);
    assert.strictEqual(regJson.success, true);
    console.log('✅ User registered: SUCCESS');

    // 2. Perform Login -> Should return verification required and tempToken
    const loginRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'unverified_tester',
        password: 'password123'
      })
    });
    const loginJson = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginJson.email_verified, false);
    assert.ok(loginJson.tempToken);
    console.log('✅ First-login OTP block and tempToken returned: SUCCESS');

    // Decode token to verify restrictions
    const decoded = jwt.verify(loginJson.tempToken, JWT_SECRET);
    assert.strictEqual(decoded.email_verified, false);

    // 3. Verify OTP code retrieved from database
    const dbCodeRes = await query(
      `SELECT * FROM email_verification_codes 
       WHERE email = 'unverified@swaply.app' AND purpose = 'FIRST_LOGIN' AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`
    );
    assert.strictEqual(dbCodeRes.rowCount, 1);
    
    // We need to fetch the raw OTP. Since we hash it, in order to test, we can query it or stub it.
    // Wait! How do we know the raw OTP code? It is sent to logs/emails in mockMode!
    // Let's read the raw OTP from the logs directory or we can temporarily seed a known hash!
    // Seeding a known code hash is extremely elegant and deterministic!
    const testOtp = '123456';
    const { hashOTP } = await import('./utils/otp.js');
    await query(
      `UPDATE email_verification_codes 
       SET code_hash = $1 
       WHERE email = 'unverified@swaply.app' AND purpose = 'FIRST_LOGIN'`,
      [hashOTP(testOtp)]
    );

    // 4. Verify OTP using verify-otp route
    const verifyRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginJson.tempToken}`
      },
      body: JSON.stringify({
        code: testOtp,
        purpose: 'FIRST_LOGIN'
      })
    });
    const verifyJson = await verifyRes.json();
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyJson.success, true);
    assert.ok(verifyJson.accessToken);
    console.log('✅ OTP Verification matches and returns active token: SUCCESS');

    // 5. Subsequent Login -> Should bypass OTP and log in normally
    const nextLoginRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'unverified_tester',
        password: 'password123'
      })
    });
    const nextLoginJson = await nextLoginRes.json();
    assert.strictEqual(nextLoginRes.status, 200);
    assert.strictEqual(nextLoginJson.email_verified, undefined); // Bypassed and returned normal access token
    assert.ok(nextLoginJson.accessToken);
    console.log('✅ Subsequent logins bypass OTP: SUCCESS');

  } catch (err) {
    console.error('❌ Email Verification API Tests failed:', err.message);
    passed = false;
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Email Verification Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runEmailVerificationTests();
