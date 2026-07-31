import assert from 'assert';
import http from 'http';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

const checkServerOnline = () => {
  return Promise.resolve(false); // Force inline server startup
};

async function runSecurityAuditTests() {
  console.log('Starting Swaply Security Audit Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  const regUser = `reg_sec_user_${Date.now()}`;
  const adminUser = `admin_sec_user_${Date.now()}`;

  try {
    const isOnline = await checkServerOnline();
    if (!isOnline) {
      console.log('📡 Local server not running. Starting backend server inline...');
      const serverModule = await import('./server.js');
      serverInstance = serverModule.httpServer;
      await new Promise(r => setTimeout(r, 1500));
    } else {
      console.log('📡 Connected to already running local server');
    }

    // Clean DB
    await query('DELETE FROM users WHERE username IN ($1, $2)', [regUser, adminUser]);

    // 1. Create DB users (Regular and Admin)
    const resReg = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [`sec_reg_${Date.now()}`, 'Regular User', regUser, `${regUser}@swaply.test`, 'hash', false]
    );
    const regUserId = resReg.rows[0].id;
    const regToken = jwt.sign({ id: regUserId, username: regUser }, JWT_ACCESS_SECRET);

    const resAdmin = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [`sec_admin_${Date.now()}`, 'Admin User', adminUser, `${adminUser}@swaply.test`, 'hash', true]
    );
    const adminUserId = resAdmin.rows[0].id;
    const adminToken = jwt.sign({ id: adminUserId, username: adminUser }, JWT_ACCESS_SECRET);

    // Seed friendship for call audit validation
    await query(
      `INSERT INTO friendships (user_id, friend_id) VALUES (LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))`,
      [regUserId, adminUserId]
    );

    // --- Test Case 1: Admin Endpoint Role Restriction ---
    console.log('\n--- Test Case 1: Admin Route Privilege Escalation Guard ---');
    
    // Regular user request (should be Forbidden)
    const resRegStats = await fetch(`${BACKEND_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${regToken}` }
    });
    assert.strictEqual(resRegStats.status, 403, 'Regular user must be forbidden from accessing admin stats');
    console.log('✅ Regular user request correctly blocked with HTTP 403 Forbidden');

    // Admin user request (should succeed)
    const resAdminStats = await fetch(`${BACKEND_URL}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(resAdminStats.status, 200, 'Admin user must be allowed to access admin stats');
    const statsData = await resAdminStats.json();
    assert.ok(statsData.success, 'Stats request response must declare success');
    console.log('✅ Authenticated admin user request successfully resolved HTTP 200');


    // --- Test Case 2: SDP Screen-Sharing Protection on Nested Object ---
    console.log('\n--- Test Case 2: Screen-Sharing Detection on Nested SDP Objects ---');
    const clientA = Client(BACKEND_URL, { forceNew: true });
    const clientB = Client(BACKEND_URL, { forceNew: true });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { if (++count === 2) resolve(); };
      clientA.on('connect', done);
      clientB.on('connect', done);
    });

    await new Promise((resolve) => {
      clientA.emit('register', regUser, () => {
        clientB.emit('register', adminUser, () => resolve());
      });
    });

    let activeSessionId = null;
    clientB.on('incoming_call', ({ sessionId }) => {
      activeSessionId = sessionId;
      clientB.emit('accept_call', { sessionId });
    });

    await new Promise((resolve) => {
      clientA.emit('initiate_call', { to: adminUser }, () => resolve());
    });

    // Wait for setup
    await new Promise((resolve) => {
      clientA.on('call_accepted', () => resolve());
    });

    // Send malformed screen sharing SDP inside nested object
    let securityViolationTriggered = false;
    await new Promise((resolve) => {
      clientA.on('security_violation', ({ error }) => {
        securityViolationTriggered = true;
        assert.ok(error.includes('Screen sharing'), 'Error must specify screen sharing violation');
        resolve();
      });

      // Emit nested SDP object with multiple video tracks to bypass basic checks
      clientA.emit('signal', {
        sessionId: activeSessionId,
        sdp: {
          type: 'offer',
          sdp: 'v=0\nm=video\nm=video\n' // Multiple video tracks indicator
        }
      });
    });

    assert.strictEqual(securityViolationTriggered, true, 'SDP screen share blocker must trigger security violation');
    console.log('✅ Blocked screen-sharing nested SDP offer and signaled security violation successfully');


    // --- Test Case 3: Socket Event Crash Injection Resistance ---
    console.log('\n--- Test Case 3: Socket Event Crash Injection Resistance ---');
    
    // Inject invalid payload types into listeners (e.g. object instead of string)
    clientA.emit('focus_changed', {
      sessionId: { illegal_object: true },
      hasFocus: 'not-a-boolean'
    });

    clientA.emit('video_state_changed', {
      sessionId: ['array', 'instead', 'of', 'string'],
      isVideoOff: { invalid: true }
    });

    // Wait a moment for server to process events
    await new Promise(r => setTimeout(r, 1000));

    // Confirm server is still alive and responding to health check
    const resHealth = await fetch(`${BACKEND_URL}/api/health`);
    assert.strictEqual(resHealth.status, 200, 'Server must remain active and healthy after parsing crash payloads');
    console.log('✅ Server successfully survived crash-injection socket payloads without crashing');

    // Clean up clients
    clientA.disconnect();
    clientB.disconnect();

    // Clean DB
    await query('DELETE FROM users WHERE username IN ($1, $2)', [regUser, adminUser]);

  } catch (err) {
    console.error('❌ Exception during security audit tests:', err);
    passed = false;
  }

  // Clean up inline server
  if (serverInstance) {
    console.log('\n🧹 Cleaning up inline backend server...');
    await new Promise((resolve) => {
      serverInstance.close(async () => {
        console.log('📡 Inline server closed.');
        try {
          const poolModule = await import('./db.js');
          await poolModule.default.end();
          console.log('✅ Database pool closed.');
        } catch (dbErr) {
          console.warn('Error closing database pool:', dbErr.message);
        }
        resolve();
      });
    });
  }

  console.log('\n==================================================');
  console.log(`Security Audit Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSecurityAuditTests();
