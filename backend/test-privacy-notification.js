import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import jwt from 'jsonwebtoken';

const PORT = 5999;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runNotificationTest() {
  console.log('Starting Swaply Privacy Notification Socket Tests...');
  let serverInstance = null;
  let passed = true;

  // Track socket connections to clean up
  const clients = [];

  try {
    // Mirror server.js state mapping
    const onlineUsers = new Map();
    const socketToUser = new Map();
    const activeCalls = new Map();

    const app = express();
    const httpServer = http.createServer(app);
    const io = new Server(httpServer);

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (token) {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (err) return next(new Error('Auth error'));
          socket.user = decoded;
          next();
        });
      } else {
        next();
      }
    });

    io.on('connection', (socket) => {
      socket.on('register', (username, cb) => {
        const name = username || socket.user?.username;
        if (name) {
          onlineUsers.set(name, socket.id);
          socketToUser.set(socket.id, name);
          if (cb) cb({ success: true });
        }
      });

      socket.on('privacy_capture_warning', ({ sessionId, source }) => {
        const username = socketToUser.get(socket.id);
        const call = activeCalls.get(sessionId);
        if (call && (call.caller === username || call.receiver === username)) {
          const recipient = call.caller === username ? call.receiver : call.caller;
          const recipientSocketId = onlineUsers.get(recipient);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('privacy_capture_warning', {
              user: username,
              source
            });
          }
        }
      });
    });

    await new Promise((resolve) => {
      serverInstance = httpServer.listen(PORT, resolve);
    });

    // Seed database call session details
    await query('DELETE FROM friendships');
    await query('DELETE FROM calls');
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['alice', 'bob']);

    const userARes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [`sec_${randomUUID()}`, 'Alice', 'alice', 'alice@swaply.com', 'password123', 'SWP-ALICE', true]
    );
    const userBRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [`sec_${randomUUID()}`, 'Bob', 'bob', 'bob@swaply.com', 'password123', 'SWP-BOB', true]
    );

    const callSessionId = 'session_notification_test';
    activeCalls.set(callSessionId, { caller: 'alice', receiver: 'bob' });

    const tokenA = jwt.sign({ id: userARes.rows[0].id, username: 'alice' }, JWT_SECRET);
    const tokenB = jwt.sign({ id: userBRes.rows[0].id, username: 'bob' }, JWT_SECRET);

    // Connect Client A (Alice)
    const socketA = clientIo(`http://127.0.0.1:${PORT}`, {
      auth: { token: tokenA },
      transports: ['websocket']
    });
    clients.push(socketA);

    // Connect Client B (Bob)
    const socketB = clientIo(`http://127.0.0.1:${PORT}`, {
      auth: { token: tokenB },
      transports: ['websocket']
    });
    clients.push(socketB);

    await new Promise((resolve) => socketA.on('connect', resolve));
    await new Promise((resolve) => socketB.on('connect', resolve));

    await new Promise((resolve) => socketA.emit('register', 'alice', resolve));
    await new Promise((resolve) => socketB.emit('register', 'bob', resolve));

    // Alice sends warning, Bob expects to receive it
    const warningPromise = new Promise((resolve) => {
      socketB.on('privacy_capture_warning', (data) => {
        resolve(data);
      });
    });

    socketA.emit('privacy_capture_warning', { sessionId: callSessionId, source: 'SCREENSHOT_KEY' });

    const received = await Promise.race([
      warningPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for notification')), 4000))
    ]);

    if (received.user !== 'alice' || received.source !== 'SCREENSHOT_KEY') {
      throw new Error('Received notification parameters mismatch');
    }
    console.log('✅ Remote participant successfully notified of capture risk in real time.');

  } catch (err) {
    console.error('❌ Notification test failed:', err.message);
    passed = false;
  } finally {
    clients.forEach((c) => c.disconnect());
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Notification Socket Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runNotificationTest();
