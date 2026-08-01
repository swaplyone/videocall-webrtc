import assert from 'assert';
import { createAndSendOTP, verifyOTP } from './utils/otpManager.js';
import pool, { query } from './db.js';

async function runOtpSecurityTests() {
  console.log('Starting Swaply OTP Security & Locking Tests...');
  let passed = true;

  try {
    const email = 'security@swaply.app';
    const purpose = 'EMAIL_VERIFICATION';

    // Clear existing records
    await query('DELETE FROM email_verification_codes WHERE email = $1', [email]);

    // 1. Test Resend Throttling (Module 7)
    const firstReq = await createAndSendOTP(null, email, purpose);
    assert.strictEqual(firstReq.success, true);
    
    // Immediate second request must trigger rate limit
    const secondReq = await createAndSendOTP(null, email, purpose);
    assert.strictEqual(secondReq.success, false);
    assert.strictEqual(secondReq.error, 'Please wait before requesting another code');
    console.log('✅ OTP Resend frequency throttling: SUCCESS');

    // 2. Test Incorrect OTP Attempt Counting & Lockout (Module 7)
    const otp = firstReq.otp;
    
    // Send 5 incorrect attempts
    for (let i = 0; i < 5; i++) {
      const result = await verifyOTP(email, '000000', purpose);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Invalid code');
    }

    // The 6th attempt (even if correct) must be locked out
    const lockedResult = await verifyOTP(email, otp, purpose);
    assert.strictEqual(lockedResult.success, false);
    assert.strictEqual(lockedResult.error, 'Too many attempts');
    console.log('✅ OTP maximum attempt lockout: SUCCESS');

    // 3. Test Expiration (Module 7)
    const expiredOtp = '123456';
    const expiredTime = new Date(Date.now() - 1000); // 1 second ago
    await query(
      `INSERT INTO email_verification_codes (email, code_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, 'somehash', 'PASSWORD_RESET', expiredTime]
    );

    const expiredResult = await verifyOTP(email, expiredOtp, 'PASSWORD_RESET');
    assert.strictEqual(expiredResult.success, false);
    assert.strictEqual(expiredResult.error, 'Code expired');
    console.log('✅ OTP expiration check: SUCCESS');

  } catch (err) {
    console.error('❌ OTP Security Tests failed:', err.message);
    passed = false;
  } finally {
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`OTP Security Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runOtpSecurityTests();
