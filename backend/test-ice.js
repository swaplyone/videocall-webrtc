import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import callRoutes from './routes/callRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply STUN/TURN ICE Configuration Tests...\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/calls', callRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral ICE test server listening on port ${PORT}`);

  let passed = true;
  const username = 'iceuser';
  let token = null;

  try {
    // 2. Setup mock user
    await query("DELETE FROM users WHERE username = $1", [username]);
    const res = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'ICE User', username, 'ice@example.com', 'pass123']
    );
    const userId = res.rows[0].id;
    token = jwt.sign({ id: userId, username }, JWT_ACCESS_SECRET);

    // 3. Test Case 1: Fetch default STUN configuration (Without Auth - Backward Compatibility check)
    console.log('\n--- Test Case 1: Fetch Default STUNs (Without Token) ---');
    const res1 = await fetch(`http://localhost:${PORT}/api/calls/ice-servers`);
    if (res1.status === 200) {
      const data = await res1.json();
      if (data.success && Array.isArray(data.iceServers)) {
        console.log(`✅ Default STUN: Returned ${data.iceServers.length} servers`);
        const urls = data.iceServers.map(s => s.urls);
        if (urls.includes('stun:stun.l.google.com:19302')) {
          console.log('✅ Default STUN: Google STUN configuration verified');
        } else {
          console.error('❌ Default STUN: Missing Google STUN url');
          passed = false;
        }
      } else {
        console.error('❌ Default STUN: Invalid response payload:', data);
        passed = false;
      }
    } else {
      console.error('❌ Default STUN: HTTP status is', res1.status);
      passed = false;
    }

    // 4. Test Case 2: Fetch default STUN configuration (With Auth)
    console.log('\n--- Test Case 2: Fetch Default STUNs (With Token) ---');
    const res2 = await fetch(`http://localhost:${PORT}/api/calls/ice-servers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res2.status === 200) {
      const data = await res2.json();
      if (data.success && data.iceServers.length === 3) {
        console.log('✅ Authed STUN: Successfully returned all default STUN items');
      } else {
        console.error('❌ Authed STUN: Expected 3 items, got:', data.iceServers ? data.iceServers.length : 'null');
        passed = false;
      }
    } else {
      console.error('❌ Authed STUN: HTTP status is', res2.status);
      passed = false;
    }

    // 5. Test Case 3: Fetch with TURN configurations injected
    console.log('\n--- Test Case 3: Fetch Dynamic TURN Overrides ---');
    // Inject mock TURN environment variables
    process.env.TURN_URL = 'turn:turn.swaply.org:3478';
    process.env.TURN_USERNAME = 'swaply_turn_user';
    process.env.TURN_CREDENTIAL = 'swaply_turn_secret_pass_123';

    const res3 = await fetch(`http://localhost:${PORT}/api/calls/ice-servers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res3.status === 200) {
      const data = await res3.json();
      if (data.success && data.iceServers.length === 4) {
        const turnServer = data.iceServers.find(s => s.urls === 'turn:turn.swaply.org:3478');
        if (turnServer && turnServer.username === 'swaply_turn_user' && turnServer.credential === 'swaply_turn_secret_pass_123') {
          console.log('✅ Dynamic TURN: Custom TURN server configurations successfully generated and verified');
        } else {
          console.error('❌ Dynamic TURN: Credentials mismatch inside response payload:', turnServer);
          passed = false;
        }
      } else {
        console.error('❌ Dynamic TURN: Expected 4 items (3 STUNs + 1 TURN), got:', data.iceServers ? data.iceServers.length : 'null');
        passed = false;
      }
    } else {
      console.error('❌ Dynamic TURN: HTTP status is', res3.status);
      passed = false;
    }

    // Cleanup env variables
    delete process.env.TURN_URL;
    delete process.env.TURN_USERNAME;
    delete process.env.TURN_CREDENTIAL;

    // Clear db records
    await query("DELETE FROM users WHERE username = $1", [username]);

  } catch (err) {
    console.error('❌ ICE configuration tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral ICE test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
