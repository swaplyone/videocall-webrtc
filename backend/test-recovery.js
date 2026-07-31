import assert from 'assert';
import http from 'http';
import { io as Client } from 'socket.io-client';
import { query } from './db.js';

const PORT = 5000;
const BACKEND_URL = `http://localhost:${PORT}`;

const checkServerOnline = () => {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
};

async function runRecoveryTests() {
  console.log('Starting Swaply Connection Recovery Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

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

    const usernameA = `recovery_user_a_${Date.now()}`;
    const usernameB = `recovery_user_b_${Date.now()}`;

    // Clean DB
    await query('DELETE FROM users WHERE username IN ($1, $2)', [usernameA, usernameB]);

    // Create DB users with required security_id
    await query(
      `INSERT INTO users (security_id, name, username, email, password_hash) VALUES ($1, $2, $3, $4, $5)`,
      [`sec_a_${Date.now()}`, 'User A', usernameA, `${usernameA}@swaply.test`, 'hash']
    );
    await query(
      `INSERT INTO users (security_id, name, username, email, password_hash) VALUES ($1, $2, $3, $4, $5)`,
      [`sec_b_${Date.now()}`, 'User B', usernameB, `${usernameB}@swaply.test`, 'hash']
    );

    console.log('--- Test Setup: Connecting Socket Clients A and B ---');
    const clientA = Client(BACKEND_URL, { forceNew: true });
    const clientB = Client(BACKEND_URL, { forceNew: true });

    await new Promise((resolve) => {
      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      clientA.on('connect', onConnect);
      clientB.on('connect', onConnect);
    });
    console.log('✅ Both socket clients connected');

    // Register users
    await new Promise((resolve) => {
      clientA.emit('register', usernameA, () => {
        clientB.emit('register', usernameB, () => {
          resolve();
        });
      });
    });
    console.log('✅ Both users registered online');

    // Initiate Call
    console.log('\n--- Test Case 1: Call Setup Stage ---');
    let activeSessionId = null;

    clientB.on('incoming_call', ({ from, sessionId }) => {
      assert.strictEqual(from, usernameA, 'Call must come from user A');
      activeSessionId = sessionId;
      console.log(`✅ User B received incoming call: ${sessionId}`);
      clientB.emit('accept_call', { sessionId });
    });

    await new Promise((resolve) => {
      clientA.emit('initiate_call', { to: usernameB }, (res) => {
        assert.strictEqual(res.success, true, 'Call initiation must succeed');
        resolve();
      });
    });

    // Wait for call acceptance handshake to complete
    await new Promise((resolve) => {
      clientA.on('call_accepted', ({ sessionId }) => {
        assert.strictEqual(sessionId, activeSessionId, 'Session ID mismatch');
        console.log('✅ User A call_accepted triggered');
        resolve();
      });
    });

    // Test Case 2: Disconnect client A socket and verify call is preserved during grace period
    console.log('\n--- Test Case 2: Socket Disconnect Grace Period Preservation ---');
    let callTerminatedTriggered = false;
    clientB.on('call_terminated', () => {
      callTerminatedTriggered = true;
    });

    console.log('Disconnecting User A socket...');
    clientA.disconnect();

    // Wait 2 seconds and verify call B is still active (not terminated)
    await new Promise(r => setTimeout(r, 2000));
    assert.strictEqual(callTerminatedTriggered, false, 'Call must NOT be terminated immediately on socket disconnect');
    console.log('✅ Call remains active during grace period');

    // Test Case 3: Re-register client A socket during grace period and verify restoration
    console.log('\n--- Test Case 3: Call Restoration on Re-registration ---');
    const clientAReconnected = Client(BACKEND_URL, { forceNew: true });
    
    await new Promise((resolve) => {
      clientAReconnected.on('connect', resolve);
    });

    let peerReconnectedEmitted = false;
    clientB.on('peer_reconnected', ({ username }) => {
      if (username === usernameA) {
        peerReconnectedEmitted = true;
      }
    });

    let callRestoredPayload = null;
    clientAReconnected.on('call_restored', (data) => {
      callRestoredPayload = data;
    });

    await new Promise((resolve) => {
      clientAReconnected.emit('register', usernameA, () => {
        resolve();
      });
    });

    // Wait for event relays
    await new Promise(r => setTimeout(r, 1000));
    assert.strictEqual(peerReconnectedEmitted, true, 'Peer B must receive peer_reconnected notification');
    assert.ok(callRestoredPayload, 'User A must receive call_restored event payload');
    assert.strictEqual(callRestoredPayload.sessionId, activeSessionId, 'Restored session ID must match');
    assert.strictEqual(callRestoredPayload.remoteUser, usernameB, 'Restored remoteUser must match');
    console.log('✅ Reconnection successfully cancelled grace period and restored call session');

    // Test Case 4: Disconnect client A socket again and let the grace period expire
    console.log('\n--- Test Case 4: Grace Period Expiration & Call Termination ---');
    console.log('Disconnecting User A socket again...');
    clientAReconnected.disconnect();

    console.log('Waiting 9 seconds for grace period (8s) to expire...');
    await new Promise(resolve => {
      clientB.on('call_terminated', () => {
        callTerminatedTriggered = true;
        resolve();
      });
      // Fallback timeout in case event is missed
      setTimeout(resolve, 9500);
    });

    assert.strictEqual(callTerminatedTriggered, true, 'Call must be terminated when grace period expires');
    console.log('✅ Grace period expired, call successfully terminated and peer notified');

    // Clean up connections
    clientB.disconnect();

  } catch (err) {
    console.error('❌ Exception during recovery tests:', err);
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
  console.log(`Recovery Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRecoveryTests();
