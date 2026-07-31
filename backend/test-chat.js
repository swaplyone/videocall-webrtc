import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import chatRoutes from './routes/chatRoutes.js';
import { moderateMessage } from './moderator.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Persistent Chat Integration Tests...\n');

  // State maps mirroring server.js
  const onlineUsers = new Map();
  const socketToUser = new Map();
  const activeSessions = new Map();
  const activeCalls = new Map();

  let moderationConfig = {
    blockPhoneNumbers: true,
    blockEmails: true,
    blockSocials: true
  };

  // Helper functions
  async function getUserIdByUsername(username) {
    const res = await query('SELECT id FROM users WHERE username = $1', [username]);
    return res.rowCount > 0 ? res.rows[0].id : null;
  }

  async function getOrCreateConversation(userId1, userId2) {
    const existRes = await query(
      `SELECT cm1.conversation_id 
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
      [userId1, userId2]
    );

    if (existRes.rowCount > 0) {
      return existRes.rows[0].conversation_id;
    }

    const convRes = await query('INSERT INTO conversations (created_at, updated_at) VALUES (NOW(), NOW()) RETURNING id');
    const convId = convRes.rows[0].id;

    await query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [convId, userId1, userId2]);
    return convId;
  }

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/chat', chatRoutes);

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

    socket.on('send_message', async ({ sessionId, text }) => {
      const username = socketToUser.get(socket.id);
      const call = activeCalls.get(sessionId);

      if (!call || call.status !== 'active') return;

      const moderationResult = moderateMessage(text, moderationConfig);

      if (!moderationResult.safe) {
        socket.emit('message_rejected', {
          text,
          error: moderationResult.error
        });
        return;
      }

      try {
        const senderId = await getUserIdByUsername(username);
        const recipientUsername = call.caller === username ? call.receiver : call.caller;
        const recipientId = await getUserIdByUsername(recipientUsername);

        if (senderId && recipientId) {
          const convId = await getOrCreateConversation(senderId, recipientId);
          await query(
            `INSERT INTO messages (conversation_id, sender_id, message, moderation_status, created_at)
             VALUES ($1, $2, $3, 'APPROVED', NOW())`,
            [convId, senderId, text]
          );
        }
      } catch (err) {
        console.error('Error saving in DB:', err);
      }

      const recipient = call.caller === username ? call.receiver : call.caller;
      const recipientSocketId = onlineUsers.get(recipient);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', {
          sender: username,
          text,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral chat test server listening on port ${PORT}`);

  let passed = true;
  const user1 = 'chatuser1';
  const user2 = 'chatuser2';
  let token1 = null;
  let token2 = null;

  try {
    // 2. Setup mock users
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);
    
    const res1 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Chatter One', user1, 'c1@example.com', 'pass123']
    );
    const id1 = res1.rows[0].id;
    token1 = jwt.sign({ id: id1, username: user1 }, JWT_ACCESS_SECRET);

    const res2 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Chatter Two', user2, 'c2@example.com', 'pass123']
    );
    const id2 = res2.rows[0].id;
    token2 = jwt.sign({ id: id2, username: user2 }, JWT_ACCESS_SECRET);

    // Seed friendship for chat validation
    await query(
      `INSERT INTO friendships (user_id, friend_id) VALUES (LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))`,
      [id1, id2]
    );

    // Setup active call session
    const sessionId = 'test-session-999';
    activeCalls.set(sessionId, {
      caller: user1,
      receiver: user2,
      status: 'active'
    });

    // 3. Connect client sockets
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

    // 4. Test Case 1: Send a valid message
    console.log('\n--- Test Case 1: Sending Valid Message ---');
    await new Promise((resolve) => {
      // User 2 should receive the message
      socket2.on('receive_message', async (payload) => {
        if (payload.sender === user1 && payload.text === 'Hello friend, how are you?') {
          console.log('✅ Client delivery: User 2 successfully received message from User 1');
          
          // Verify saved in DB
          const dbMsgs = await query(
            `SELECT m.message 
             FROM messages m
             JOIN conversation_members cm1 ON m.conversation_id = cm1.conversation_id
             JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
             WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
            [id1, id2]
          );

          if (dbMsgs.rowCount === 1 && dbMsgs.rows[0].message === 'Hello friend, how are you?') {
            console.log('✅ Database Storage: Valid message successfully saved to PostgreSQL');
          } else {
            console.error('❌ Database Storage: Message not found or mismatch');
            passed = false;
          }
          resolve();
        }
      });

      socket1.emit('send_message', { sessionId, text: 'Hello friend, how are you?' });
    });

    // Remove socket2 receive listener for next tests
    socket2.off('receive_message');

    // 5. Test Case 2: Send a blocked message (Spam/Phone Number)
    console.log('\n--- Test Case 2: Sending Blocked Message (Phone Moderation) ---');
    await new Promise((resolve) => {
      let receiveTriggered = false;

      socket2.on('receive_message', () => {
        receiveTriggered = true;
      });

      socket1.on('message_rejected', async (payload) => {
        if (payload.error.includes('sharing phone numbers')) {
          console.log('✅ Moderation Interception: Server successfully blocked phone numbers and warned sender');
          
          // Wait briefly to make sure receive_message was not emitted to User 2
          await new Promise((r) => setTimeout(r, 200));

          if (!receiveTriggered) {
            console.log('✅ Peer Delivery: Blocked message was not delivered to User 2');
          } else {
            console.error('❌ Peer Delivery: Blocked message was leaked to User 2');
            passed = false;
          }

          // Verify NOT saved in DB
          const dbBlockedMsgs = await query(
            `SELECT count(*) FROM messages WHERE message LIKE '%nine eight%'`
          );
          if (parseInt(dbBlockedMsgs.rows[0].count, 10) === 0) {
            console.log('✅ Database Isolation: Blocked message was not saved in PostgreSQL');
          } else {
            console.error('❌ Database Isolation: Blocked message was written to the database!');
            passed = false;
          }
          resolve();
        }
      });

      socket1.emit('send_message', {
        sessionId,
        text: 'Call me at nine eight seven six five four three two one zero'
      });
    });

    // 6. Test Case 3: Fetch Chat History REST endpoint
    console.log('\n--- Test Case 3: Fetch Chat History Endpoint ---');
    const historyRes = await fetch(`http://localhost:${PORT}/api/chat/history/${user2}`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });

    if (historyRes.status === 200) {
      const data = await historyRes.json();
      if (data.success && data.messages.length === 1) {
        const msg = data.messages[0];
        if (msg.sender === user1 && msg.text === 'Hello friend, how are you?') {
          console.log('✅ Chat History: Successfully retrieved approved messages only');
        } else {
          console.error('❌ Chat History: Content mismatch');
          passed = false;
        }
      } else {
        console.error('❌ Chat History: Expected 1 message, got:', data.messages ? data.messages.length : 'null');
        passed = false;
      }
    } else {
      console.error('❌ Chat History: HTTP request failed with status', historyRes.status);
      passed = false;
    }

    // Clean connections
    socket1.disconnect();
    socket2.disconnect();

    // Clear db test records
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);

  } catch (err) {
    console.error('❌ Chat integration tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral chat test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
