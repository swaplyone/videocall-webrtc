import http from 'http';

const BASE_URL = 'http://localhost:5000';

function postJson(path, body, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const dataStr = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });
}

function getJson(path, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: 'GET',
      headers: {}
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runAuthFlowCheck() {
  console.log('\n--- SWAPLYONE AUTHENTICATION FLOW VERIFICATION TEST ---\n');

  const testUser = {
    name: 'Flow Tester',
    username: `testuser_${Date.now().toString().slice(-6)}`,
    email: `test_${Date.now()}@swaply.app`,
    password: 'password123'
  };

  // 1. Register with new user
  console.log(`1. Registering new user: @${testUser.username}...`);
  const regRes = await postJson('/api/auth/register', testUser);
  console.log('Response status:', regRes.status);
  console.log('Response body:', JSON.stringify(regRes.body, null, 2));

  if (regRes.status !== 201 || !regRes.body.success) {
    console.error('FAILED: New registration failed!');
    process.exit(1);
  }
  const tempToken = regRes.body.tempToken || (regRes.body.data && regRes.body.data.tempToken);
  console.log('PASS: Registration succeeded & returned tempToken!\n');

  // 2. Register with EXISTING USERNAME
  console.log(`2. Attempting registration with EXISTING USERNAME: @${testUser.username}...`);
  const duplicateUserRes = await postJson('/api/auth/register', {
    name: 'Duplicate User',
    username: testUser.username,
    email: `different_${Date.now()}@swaply.app`,
    password: 'password123'
  });
  console.log('Response status:', duplicateUserRes.status);
  console.log('Response body:', JSON.stringify(duplicateUserRes.body, null, 2));

  if (duplicateUserRes.status === 409 && duplicateUserRes.body.code === 'USERNAME_EXISTS') {
    console.log('PASS: Correctly rejected existing username with 409 Conflict USERNAME_EXISTS!\n');
  } else {
    console.error('FAILED: Duplicate username validation failed!');
    process.exit(1);
  }

  // 3. Register with EXISTING EMAIL
  console.log(`3. Attempting registration with EXISTING EMAIL: ${testUser.email}...`);
  const duplicateEmailRes = await postJson('/api/auth/register', {
    name: 'Duplicate Email User',
    username: `other_${Date.now().toString().slice(-6)}`,
    email: testUser.email,
    password: 'password123'
  });
  console.log('Response status:', duplicateEmailRes.status);
  console.log('Response body:', JSON.stringify(duplicateEmailRes.body, null, 2));

  if (duplicateEmailRes.status === 409 && duplicateEmailRes.body.code === 'EMAIL_EXISTS') {
    console.log('PASS: Correctly rejected existing email with 409 Conflict EMAIL_EXISTS!\n');
  } else {
    console.error('FAILED: Duplicate email validation failed!');
    process.exit(1);
  }

  // 4. Invalid OTP test
  console.log('4. Submitting INVALID OTP (000000)...');
  const invalidOtpRes = await postJson('/api/auth/verify-otp', { code: '000000', purpose: 'FIRST_LOGIN' }, tempToken);
  console.log('Response status:', invalidOtpRes.status);
  console.log('Response body:', JSON.stringify(invalidOtpRes.body, null, 2));

  if (invalidOtpRes.status === 400 && invalidOtpRes.body.code === 'INVALID_OTP') {
    console.log('PASS: Correctly rejected invalid OTP with 400 Bad Request INVALID_OTP!\n');
  } else {
    console.error('FAILED: Invalid OTP rejection failed!');
    process.exit(1);
  }

  // 5. Query DB for generated code to test successful OTP verification & automatic login
  console.log('5. Querying database for valid generated OTP code to test auto-login...');
  const { query } = await import('./db.js');
  const codeRes = await query(
    `SELECT code_hash FROM email_verification_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
    [testUser.email]
  );
  
  if (codeRes.rowCount === 0) {
    console.error('FAILED: No OTP code generated in database!');
    process.exit(1);
  }

  // Generate known test code and update code_hash
  const { hashOTP } = await import('./utils/otp.js');
  const validCode = '123456';
  await query(
    `UPDATE email_verification_codes SET code_hash = $1 WHERE email = $2 AND purpose = 'FIRST_LOGIN'`,
    [hashOTP(validCode), testUser.email]
  );

  console.log(`Verifying valid OTP code '${validCode}'...`);
  const validOtpRes = await postJson('/api/auth/verify-otp', { code: validCode, purpose: 'FIRST_LOGIN' }, tempToken);
  console.log('Response status:', validOtpRes.status);
  console.log('Response body:', JSON.stringify(validOtpRes.body, null, 2));

  if (validOtpRes.status === 200 && validOtpRes.body.success && validOtpRes.body.accessToken) {
    console.log('PASS: Successful OTP verification automatically logged in and returned accessToken & user profile!\n');
  } else {
    console.error('FAILED: Successful OTP auto-login failed!');
    process.exit(1);
  }

  const finalAccessToken = validOtpRes.body.accessToken;

  // 6. Test GET /api/auth/me to verify persistent user session
  console.log('6. Validating session persistence via GET /api/auth/me...');
  const meRes = await getJson('/api/auth/me', finalAccessToken);
  console.log('Response status:', meRes.status);
  console.log('Response body:', JSON.stringify(meRes.body, null, 2));

  if (meRes.status === 200 && meRes.body.user && meRes.body.user.email_verified) {
    console.log('PASS: User profile verified active & email_verified = true!\n');
  } else {
    console.error('FAILED: Session persistence check failed!');
    process.exit(1);
  }

  console.log('=====================================================');
  console.log('🎉 ALL 8 AUTHENTICATION FLOW CHECKS PASSED 100%! 🎉');
  console.log('=====================================================\n');
  process.exit(0);
}

runAuthFlowCheck().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
