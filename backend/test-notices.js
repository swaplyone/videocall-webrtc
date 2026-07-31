import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import authRoutes from './routes/authRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Privacy and Safety Notices Tests...\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral Notices test server listening on port ${PORT}`);

  let passed = true;
  const username = 'noticeuser';
  let token = null;
  let userId = null;

  try {
    // 2. Setup mock user (ensuring notice_accepted defaults to false)
    await query("DELETE FROM users WHERE username = $1", [username]);
    
    // Hash password "pass123" using the application's authUtils
    const { hashPassword } = await import('./utils/authUtils.js');
    const passwordHash = await hashPassword('pass123');
    
    const res = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Notice User', username, 'notice@example.com', passwordHash]
    );
    userId = res.rows[0].id;
    token = jwt.sign({ id: userId, username }, JWT_ACCESS_SECRET);

    // 3. Test Case 1: Fetch Profile (Assert notice_accepted is false by default)
    console.log('\n--- Test Case 1: Assert Notice Default False state ---');
    const profileRes1 = await fetch(`http://localhost:${PORT}/api/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (profileRes1.status === 200) {
      const data = await profileRes1.json();
      if (data.success && data.user.notice_accepted === false) {
        console.log('✅ Default State: notice_accepted is false in PostgreSQL');
      } else {
        console.error('❌ Default State: expected notice_accepted to be false, got:', data.user ? data.user.notice_accepted : 'null');
        passed = false;
      }
    } else {
      console.error('❌ Default State: HTTP profile status is', profileRes1.status);
      passed = false;
    }

    // 4. Test Case 2: Accept Notice
    console.log('\n--- Test Case 2: Trigger Accept Notice REST update ---');
    const acceptRes = await fetch(`http://localhost:${PORT}/api/auth/accept-notice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (acceptRes.status === 200) {
      const data = await acceptRes.json();
      if (data.success && data.notice_accepted === true) {
        console.log('✅ Accept Notice: REST response verified successfully');
      } else {
        console.error('❌ Accept Notice: Incorrect payload response:', data);
        passed = false;
      }
    } else {
      console.error('❌ Accept Notice: HTTP status is', acceptRes.status);
      passed = false;
    }

    // 5. Test Case 3: Verify Profile (Assert notice_accepted is now true)
    console.log('\n--- Test Case 3: Re-query Profile Notice state ---');
    const profileRes2 = await fetch(`http://localhost:${PORT}/api/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (profileRes2.status === 200) {
      const data = await profileRes2.json();
      if (data.success && data.user.notice_accepted === true) {
        console.log('✅ State Update: Profile successfully returns notice_accepted = true');
      } else {
        console.error('❌ State Update: expected notice_accepted to be true, got:', data.user ? data.user.notice_accepted : 'null');
        passed = false;
      }
    } else {
      console.error('❌ State Update: HTTP profile status is', profileRes2.status);
      passed = false;
    }

    // 6. Test Case 4: Verify Login Payload (Assert notice_accepted is true)
    console.log('\n--- Test Case 4: Verify Login response payload ---');
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: username, password: 'pass123' })
    });

    if (loginRes.status === 200) {
      const data = await loginRes.json();
      if (data.success && data.user.notice_accepted === true) {
        console.log('✅ Login Payload: notice_accepted status successfully propagated');
      } else {
        console.error('❌ Login Payload: expected notice_accepted to be true, got:', data.user ? data.user.notice_accepted : 'null');
        passed = false;
      }
    } else {
      console.error('❌ Login Payload: HTTP login status is', loginRes.status);
      passed = false;
    }

    // Clear db records
    await query("DELETE FROM users WHERE username = $1", [username]);

  } catch (err) {
    console.error('❌ Notices tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral Notices test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
