import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import pool from './db.js';

const TEST_PORT = 5002;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runPasswordResetTests() {
  console.log('Starting Swaply Password Reset & Session Security Tests...');
  let passed = true;

  const { default: express } = await import('express');
  const app = express();
  app.use(express.json());
  
  const { default: authRoutes } = await import('./routes/authRoutes.js');
  app.use('/api/auth', authRoutes);

  const server = app.listen(TEST_PORT);

  try {
    await query('DELETE FROM email_verification_codes');
    await query('DELETE FROM users WHERE username = $1', ['reset_tester']);

    // 1. Create a user (Force email_verified = true so they can log in and have valid token)
    const { hashPassword } = await import('./utils/authUtils.js');
    const oldHash = await hashPassword('oldpassword');
    const userRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, security_id`,
      ['sec_old_12345', 'Reset Tester', 'reset_tester', 'reset@swaply.app', oldHash]
    );
    const userId = userRes.rows[0].id;

    // 2. Issue a token for the old session
    const oldToken = jwt.sign(
      { id: userId, username: 'reset_tester', securityId: 'sec_old_12345' },
      JWT_SECRET
    );

    // 3. Request Password Reset
    const requestRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@swaply.app' })
    });
    const requestJson = await requestRes.json();
    assert.strictEqual(requestRes.status, 200);
    assert.strictEqual(requestJson.success, true);
    console.log('✅ Forgot password request: SUCCESS');

    // 4. Overwrite OTP hash in database for deterministic validation
    const testOtp = '654321';
    const { hashOTP } = await import('./utils/otp.js');
    await query(
      `UPDATE email_verification_codes 
       SET code_hash = $1 
       WHERE email = 'reset@swaply.app' AND purpose = 'PASSWORD_RESET'`,
      [hashOTP(testOtp)]
    );

    // 5. Pre-verify OTP code
    const preVerifyRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/verify-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'reset@swaply.app', code: testOtp })
    });
    assert.strictEqual(preVerifyRes.status, 200);
    console.log('✅ Reset code verification: SUCCESS');

    // 6. Complete Reset Password (Module 12)
    const resetRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'reset@swaply.app',
        code: testOtp,
        newPassword: 'newsecurepassword'
      })
    });
    const resetJson = await resetRes.json();
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetJson.success, true);
    console.log('✅ Password successfully updated: SUCCESS');

    // 7. Verify session security token invalidation (Module 23)
    // The old JWT token contains securityId = 'sec_old_12345', but database has a new security_id.
    // Try to hit any protected route mounting authenticateToken
    app.get('/api/protected-test', (await import('./middleware/authMiddleware.js')).authenticateToken, (req, res) => {
      res.json({ success: true });
    });

    const protectedRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/protected-test`, {
      headers: { 'Authorization': `Bearer ${oldToken}` }
    });
    
    // Should return 403 Forbidden due to security ID mismatch
    assert.strictEqual(protectedRes.status, 403);
    const protectedJson = await protectedRes.json();
    assert.strictEqual(protectedJson.error, 'Session invalidated');
    console.log('✅ Old session tokens invalidated: SUCCESS');

  } catch (err) {
    console.error('❌ Password Reset API Tests failed:', err.message);
    passed = false;
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Password Reset Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runPasswordResetTests();
