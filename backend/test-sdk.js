import assert from 'assert';
import http from 'http';
import { apiClient } from '../frontend/src/utils/apiClient.js';
import { socketClient } from '../frontend/src/utils/socketClient.js';

// Setup environment variables for test execution
process.env.VITE_BACKEND_URL = 'http://localhost:5000';

const checkServerOnline = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.end();
  });
};

async function runTests() {
  console.log('Starting Swaply Developer SDK Integration Tests...\n');
  let passed = true;
  let serverInstance = null;

  try {
    const isOnline = await checkServerOnline();
    if (!isOnline) {
      console.log('📡 Local server not running. Starting backend server inline...');
      const serverModule = await import('./server.js');
      serverInstance = serverModule.httpServer;
      // Wait a moment for server and database pool to initialize
      await new Promise(r => setTimeout(r, 1500));
    } else {
      console.log('📡 Connected to already running local server');
    }

    // Test Case 1: SDK Modules Interfaces
    console.log('\n--- Test Case 1: API Client Interface Verification ---');
    assert.strictEqual(typeof apiClient.setAuthToken, 'function', 'setAuthToken must be exported');
    assert.strictEqual(typeof apiClient.register, 'function', 'register must be exported');
    assert.strictEqual(typeof apiClient.login, 'function', 'login must be exported');
    assert.strictEqual(typeof apiClient.getCallHistory, 'function', 'getCallHistory must be exported');
    assert.strictEqual(typeof apiClient.submitFeedback, 'function', 'submitFeedback must be exported');
    assert.strictEqual(typeof apiClient.getHealth, 'function', 'getHealth must be exported');
    console.log('✅ All apiClient functions are correctly exposed');

    console.log('\n--- Test Case 2: Socket Client Interface Verification ---');
    assert.strictEqual(typeof socketClient.initialize, 'function', 'initialize must be exported');
    assert.strictEqual(typeof socketClient.connect, 'function', 'connect must be exported');
    assert.strictEqual(typeof socketClient.disconnect, 'function', 'disconnect must be exported');
    assert.strictEqual(typeof socketClient.register, 'function', 'register must be exported');
    assert.strictEqual(typeof socketClient.requestCall, 'function', 'requestCall must be exported');
    console.log('✅ All socketClient functions are correctly exposed');

    // Test Case 3: Live HTTP REST Telemetry query via apiClient
    console.log('\n--- Test Case 3: Live Health Check REST Dispatch via SDK ---');
    const health = await apiClient.getHealth();
    assert.strictEqual(health.status, 'UP', 'Health check status must return UP');
    console.log('✅ Live REST dispatch successfully returned status UP');

    // Test Case 4: Auth registration and login via apiClient
    console.log('\n--- Test Case 4: Registration and Login Integration ---');
    const username = `sdk_user_${Date.now()}`;
    const password = 'sdk_password_123';
    const email = `${username}@swaply.test`;

    const regData = await apiClient.register({
      name: 'SDK Agent',
      username,
      email,
      password
    });
    assert.strictEqual(regData.success, true, 'Registration must be successful');
    console.log(`✅ SDK registered user successfully: ${username}`);

    const loginData = await apiClient.login(username, password);
    assert.strictEqual(loginData.success, true, 'Login must be successful');
    assert.ok(loginData.accessToken, 'Access token must be returned');
    console.log('✅ SDK login successful, accessToken stored locally');

    // Test Case 5: Authenticated logs fetching via apiClient
    console.log('\n--- Test Case 5: Authenticated Call Logs Fetch ---');
    apiClient.setAuthToken(loginData.accessToken);
    const historyData = await apiClient.getCallHistory('all');
    assert.strictEqual(historyData.success, true, 'Call history fetch must succeed');
    assert.ok(Array.isArray(historyData.calls), 'Calls log must be an array');
    console.log('✅ SDK authenticated fetch call logs resolved successfully');

    // Test Case 6: Live WebSocket connections via socketClient
    console.log('\n--- Test Case 6: Real-time Socket Connection & Registration ---');
    const socket = socketClient.initialize(loginData.accessToken);
    
    await new Promise((resolve, reject) => {
      // Set connection timeout
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timed out'));
      }, 5000);

      socketClient.connect();

      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Socket connected successfully');
        
        socketClient.register(username, (regResponse) => {
          assert.strictEqual(regResponse.success, true, 'Real-time registration must succeed');
          console.log('✅ Socket registered username successfully');
          socketClient.disconnect();
          resolve();
        });
      });
    });

  } catch (err) {
    console.error('❌ Exception during SDK tests:', err);
    passed = false;
  }

  // Clean up if we started the server inline
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
  console.log(`SDK Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
