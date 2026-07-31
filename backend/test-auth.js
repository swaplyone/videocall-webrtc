import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { query } from './db.js';
import authRoutes from './routes/authRoutes.js';
import jwt from 'jsonwebtoken';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Authentication Integration Tests...\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  // Mount socket auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error'));
        }
        socket.user = decoded;
        next();
      });
    } else {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    socket.on('whoami', (callback) => {
      callback({ username: socket.user ? socket.user.username : null });
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral test server listening on port ${PORT}`);

  let passed = true;
  let testAccessToken = null;
  let testCookies = '';

  try {
    // Clean up stale data
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['authuser1', 'authuser2']);

    const baseUrl = `http://localhost:${PORT}/api/auth`;

    // 2. Test Registration
    console.log('\n--- 2. Testing Registration ---');
    const regPayload = {
      name: 'Auth User One',
      username: 'authuser1',
      email: 'authuser1@example.com',
      password: 'password123'
    };

    const regRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });

    if (regRes.status === 201) {
      const data = await regRes.json();
      if (data.success && data.user.username === 'authuser1' && !data.user.password_hash) {
        console.log('✅ Registration: successfully created user and omitted password hash');
      } else {
        console.error('❌ Registration: invalid response body');
        passed = false;
      }
    } else {
      console.error('❌ Registration: failed with status', regRes.status);
      passed = false;
    }

    // Duplicate Registration
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    if (dupRes.status === 409) {
      console.log('✅ Registration Check: blocked duplicate user correctly (409 Conflict)');
    } else {
      console.error('❌ Registration Check: failed to block duplicate, status', dupRes.status);
      passed = false;
    }

    // 3. Test Login
    console.log('\n--- 3. Testing Login ---');
    const loginPayload = {
      identifier: 'authuser1',
      password: 'password123'
    };

    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload)
    });

    if (loginRes.status === 200) {
      const data = await loginRes.json();
      testAccessToken = data.accessToken;
      const cookieHeader = loginRes.headers.get('set-cookie');
      if (cookieHeader) {
        testCookies = cookieHeader;
      }
      if (data.success && testAccessToken && data.user.security_id.startsWith('sec_')) {
        console.log('✅ Login: success, access token received, security_id generated');
      } else {
        console.error('❌ Login: invalid token/response payload');
        passed = false;
      }
    } else {
      console.error('❌ Login: failed with status', loginRes.status);
      passed = false;
    }

    // 4. Test Route Authorization (GET Profile)
    console.log('\n--- 4. Testing Profile Route Protection ---');
    
    // Test profile without token
    const noTokenProfile = await fetch(`${baseUrl}/profile`);
    if (noTokenProfile.status === 401) {
      console.log('✅ Profile Guard: successfully blocked request without token (401)');
    } else {
      console.error('❌ Profile Guard: failed to block request without token, status', noTokenProfile.status);
      passed = false;
    }

    // Test profile with invalid token
    const badTokenProfile = await fetch(`${baseUrl}/profile`, {
      headers: { 'Authorization': 'Bearer invalid_token_here' }
    });
    if (badTokenProfile.status === 403) {
      console.log('✅ Profile Guard: successfully blocked invalid token (403)');
    } else {
      console.error('❌ Profile Guard: failed to block invalid token, status', badTokenProfile.status);
      passed = false;
    }

    // Test profile with valid token
    const goodProfile = await fetch(`${baseUrl}/profile`, {
      headers: { 'Authorization': `Bearer ${testAccessToken}` }
    });
    if (goodProfile.status === 200) {
      const data = await goodProfile.json();
      if (data.user.username === 'authuser1') {
        console.log('✅ Profile Guard: successfully loaded profile with valid token');
      } else {
        console.error('❌ Profile Guard: username mismatch');
        passed = false;
      }
    } else {
      console.error('❌ Profile Guard: failed to load profile, status', goodProfile.status);
      passed = false;
    }

    // 5. Test Profile Updates
    console.log('\n--- 5. Testing Profile Updates ---');
    const updatePayload = {
      name: 'Updated Name',
      bio: 'New bio details for testing.',
      profile_image: 'https://example.com/avatar.jpg'
    };

    const updateRes = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testAccessToken}`
      },
      body: JSON.stringify(updatePayload)
    });

    if (updateRes.status === 200) {
      const data = await updateRes.json();
      if (data.user.name === 'Updated Name' && data.user.bio === 'New bio details for testing.') {
        console.log('✅ Profile Update: success, values modified');
      } else {
        console.error('❌ Profile Update: values do not match updates');
        passed = false;
      }
    } else {
      console.error('❌ Profile Update: failed, status', updateRes.status);
      passed = false;
    }

    // 6. Test Socket.io Handshake Verification
    console.log('\n--- 6. Testing Socket.io Handshake ---');

    // Test anonymous socket connection (Fallback mode)
    const socketAnon = clientIo(`http://localhost:${PORT}`, {
      autoConnect: false
    });
    await new Promise((resolve, reject) => {
      socketAnon.connect();
      socketAnon.on('connect', () => {
        socketAnon.emit('whoami', (res) => {
          if (res.username === null) {
            console.log('✅ Socket Handshake: Anonymous fallback connection allowed');
            resolve();
          } else {
            reject(new Error('Anonymous username should be null'));
          }
        });
      });
      socketAnon.on('connect_error', (err) => reject(err));
    });
    socketAnon.disconnect();

    // Test authenticated socket connection
    const socketAuth = clientIo(`http://localhost:${PORT}`, {
      auth: { token: testAccessToken },
      autoConnect: false
    });
    await new Promise((resolve, reject) => {
      socketAuth.connect();
      socketAuth.on('connect', () => {
        socketAuth.emit('whoami', (res) => {
          if (res.username === 'authuser1') {
            console.log('✅ Socket Handshake: Authenticated JWT token verified successfully');
            resolve();
          } else {
            reject(new Error('Authenticated username mismatch'));
          }
        });
      });
      socketAuth.on('connect_error', (err) => reject(err));
    });
    socketAuth.disconnect();

    // Clean up database test user
    await query('DELETE FROM users WHERE username = $1', ['authuser1']);

  } catch (err) {
    console.error('❌ Integration tests encountered error:', err);
    passed = false;
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral test server closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
