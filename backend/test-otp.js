import assert from 'assert';
import { generateOTP, hashOTP } from './utils/otp.js';

async function runOtpTests() {
  console.log('Running Swaply OTP Unit Tests...');
  let passed = true;

  try {
    // Test 1: Length and Numeric Format (Module 3)
    const code = generateOTP();
    assert.strictEqual(typeof code, 'string');
    assert.strictEqual(code.length, 6);
    assert.ok(/^\d{6}$/.test(code), 'OTP must be composed of exactly 6 digits');
    console.log('✅ Generated OTP length and numeric format: SUCCESS');

    // Test 2: Uniqueness of consecutive generation
    const code2 = generateOTP();
    assert.notStrictEqual(code, code2);
    console.log('✅ Generated OTP uniqueness: SUCCESS');

    // Test 3: Hashing & Verification (Module 3)
    const hash1 = hashOTP(code);
    const hash2 = hashOTP(code);
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, code); // Must not be plain text
    assert.strictEqual(hash1.length, 64); // SHA-256 hex length
    console.log('✅ OTP SHA-256 hashing and consistency: SUCCESS');

  } catch (err) {
    console.error('❌ OTP Unit Tests failed:', err.message);
    passed = false;
  }

  console.log('\n==================================================');
  console.log(`OTP Unit Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runOtpTests();
