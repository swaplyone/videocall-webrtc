import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import callRoutes from './routes/callRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Call History Integration Tests...\n');

  // State maps mirroring server.js
  const onlineUsers = new Map();
  const socketToUser = new Map();
  const activeSessions = new Map();
  const activeCalls = new Map();

  // Helper functions
  async function getUserIdByUsername(username) {
    const res = await query('SELECT id FROM users WHERE username = $1', [username]);
    return res.rowCount > 0 ? res.rows[0].id : null;
  }

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/calls', callRoutes);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  // Handshake authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
        if (err) return next(new Error('Auth error'));
        socket.user = decoded;
        next();
      });
    } else {
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    socket.on('register', (username, callback) => {
      const cleanUsername = socket.user ? socket.user.username : username.trim();
      onlineUsers.set(cleanUsername, socket.id);
      socketToUser.set(socket.id, cleanUsername);
      callback({ success: true });
    });

    socket.on('initiate_call', async ({ to }, callback) => {
      const caller = socketToUser.get(socket.id);
      const receiverSocketId = onlineUsers.get(to);
      const sessionId = `call_${Math.random().toString(36).substring(2, 15)}`;

      let dbCallId = null;
      try {
        const callerId = await getUserIdByUsername(caller);
        const receiverId = await getUserIdByUsername(to);
        if (callerId && receiverId) {
          const insRes = await query(
            `INSERT INTO calls (caller_id, receiver_id, status, started_at)
             VALUES ($1, $2, 'ringing', NOW()) RETURNING id`,
            [callerId, receiverId]
          );
          dbCallId = insRes.rows[0].id;
        }
      } catch (err) {
        console.error('DB Insert error:', err);
      }

      activeCalls.set(sessionId, {
        dbCallId,
        caller,
        receiver: to,
        status: 'ringing',
        startTime: Date.now()
      });

      io.to(receiverSocketId).emit('incoming_call', { from: caller, sessionId });
      callback({ success: true, sessionId });
    });

    socket.on('accept_call', async ({ sessionId }, callback) => {
      const call = activeCalls.get(sessionId);
      call.status = 'active';
      call.startTime = Date.now();

      if (call.dbCallId) {
        await query("UPDATE calls SET status = 'active', started_at = NOW() WHERE id = $1", [call.dbCallId]);
      }

      const callerSocketId = onlineUsers.get(call.caller);
      io.to(callerSocketId).emit('call_accepted', { sessionId });
      callback({ success: true });
    });

    socket.on('terminate_call', async ({ sessionId }) => {
      const username = socketToUser.get(socket.id);
      const call = activeCalls.get(sessionId);
      const duration = Math.round((Date.now() - call.startTime) / 1000);

      if (call.dbCallId) {
        await query(
          "UPDATE calls SET status = 'completed', ended_at = NOW(), duration = $1 WHERE id = $2",
          [duration, call.dbCallId]
        );
      }

      const peer = call.caller === username ? call.receiver : call.caller;
      const peerSocketId = onlineUsers.get(peer);
      io.to(peerSocketId).emit('call_terminated', { sessionId });
      activeCalls.delete(sessionId);
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral call test server listening on port ${PORT}`);

  let passed = true;
  const user1 = 'calluser1';
  const user2 = 'calluser2';
  let token1 = null;
  let token2 = null;

  try {
    // 2. Setup mock users
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);
    
    const res1 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Caller One', user1, 'call1@example.com', 'pass123']
    );
    const id1 = res1.rows[0].id;
    token1 = jwt.sign({ id: id1, username: user1 }, JWT_ACCESS_SECRET);

    const res2 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Receiver Two', user2, 'call2@example.com', 'pass123']
    );
    const id2 = res2.rows[0].id;
    token2 = jwt.sign({ id: id2, username: user2 }, JWT_ACCESS_SECRET);

    // Connect clients
    const socket1 = clientIo(`http://localhost:${PORT}`, { auth: { token: token1 } });
    const socket2 = clientIo(`http://localhost:${PORT}`, { auth: { token: token2 } });

    await new Promise((resolve) => {
      let registered = 0;
      const onReg = () => {
        registered++;
        if (registered === 2) resolve();
      };
      socket1.on('connect', () => socket1.emit('register', user1, onReg));
      socket2.on('connect', () => socket2.emit('register', user2, onReg));
    });

    // 3. Test Case 1: Execute call sequence (Initiate -> Accept -> Wait 2s -> Terminate)
    console.log('\n--- Test Case 1: Executing Call Transaction Loop ---');
    let testSessionId = null;

    await new Promise((resolve) => {
      // User 2 listens for incoming
      socket2.on('incoming_call', ({ sessionId }) => {
        testSessionId = sessionId;
        console.log('✅ Socket event: User 2 received incoming_call');
        // User 2 accepts
        socket2.emit('accept_call', { sessionId }, () => {
          console.log('✅ Socket event: User 2 accepted call');
        });
      });

      // User 1 listens for acceptance
      socket1.on('call_accepted', async () => {
        console.log('✅ Socket event: User 1 received call_accepted. Call is active. Waiting 2 seconds...');
        await new Promise((r) => setTimeout(r, 2100)); // wait ~2 seconds
        
        // User 1 terminates call
        console.log('User 1 terminating call...');
        socket1.emit('terminate_call', { sessionId: testSessionId });
      });

      // User 2 listens for termination
      socket2.on('call_terminated', () => {
        console.log('✅ Socket event: User 2 received call_terminated. Loop completed.');
        resolve();
      });

      // User 1 initiates
      socket1.emit('initiate_call', { to: user2 }, (res) => {
        if (res.success) {
          console.log('✅ Socket event: User 1 initiated call');
        }
      });
    });

    // 4. Verify Call Log exists in Database
    console.log('\n--- Asserting Database Call Logs ---');
    const dbCalls = await query(
      'SELECT status, duration FROM calls WHERE caller_id = $1 AND receiver_id = $2',
      [id1, id2]
    );

    if (dbCalls.rowCount === 1) {
      const call = dbCalls.rows[0];
      if (call.status === 'completed' && call.duration >= 1 && call.duration <= 4) {
        console.log(`✅ Database Log: Call log updated to 'completed' with duration of ${call.duration} seconds`);
      } else {
        console.error('❌ Database Log: Status is', call.status, 'duration is', call.duration);
        passed = false;
      }
    } else {
      console.error('❌ Database Log: No call log found');
      passed = false;
    }

    // 5. Test Case 2: Fetch history REST endpoint
    console.log('\n--- Test Case 2: Fetching Call History REST Endpoint ---');
    const historyRes = await fetch(`http://localhost:${PORT}/api/calls/history`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    if (historyRes.status === 200) {
      const data = await historyRes.json();
      if (data.success && data.calls.length === 1) {
        const c = data.calls[0];
        if (c.partner_username === user2 && c.status === 'completed' && c.duration.includes('seconds')) {
          console.log(`✅ Call History API: Returned partner "${c.partner_name}" with duration "${c.duration}"`);
        } else {
          console.error('❌ Call History API: Data mismatch:', c);
          passed = false;
        }
      } else {
        console.error('❌ Call History API: Expected 1 call, got:', data.calls ? data.calls.length : 'null');
        passed = false;
      }
    } else {
      console.error('❌ Call History API: HTTP request failed with status', historyRes.status);
      passed = false;
    }

    // Disconnect sockets
    socket1.disconnect();
    socket2.disconnect();

    // Clear db records
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);

  } catch (err) {
    console.error('❌ Call history tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral call test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
