import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import userRoutes from './routes/userRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Blocking & Reporting Integration Tests...\n');

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
  app.use('/api/users', userRoutes);

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

      // Verify privacy blocks
      const callerId = await getUserIdByUsername(caller);
      const receiverId = await getUserIdByUsername(to);

      if (callerId && receiverId) {
        try {
          const blockCheck = await query(
            `SELECT 1 FROM blocks 
             WHERE (blocker_id = $1 AND blocked_user_id = $2) 
                OR (blocker_id = $2 AND blocked_user_id = $1)`,
            [callerId, receiverId]
          );
          if (blockCheck.rowCount > 0) {
            return callback({ success: false, error: 'Call blocked by user privacy settings' });
          }
        } catch (err) {
          console.error(err);
        }
      }

      callback({ success: true, sessionId: 'test-session' });
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral block test server listening on port ${PORT}`);

  let passed = true;
  const user1 = 'blockuser1';
  const user2 = 'blockuser2';
  const user3 = 'blockuser3';
  let token1, token2, token3;
  let id1, id2, id3;

  try {
    // 2. Setup mock users
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", [user1, user2, user3]);
    
    const r1 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'User One', user1, 'u1@example.com', 'pass123']
    );
    id1 = r1.rows[0].id;
    token1 = jwt.sign({ id: id1, username: user1 }, JWT_ACCESS_SECRET);

    const r2 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'User Two', user2, 'u2@example.com', 'pass123']
    );
    id2 = r2.rows[0].id;
    token2 = jwt.sign({ id: id2, username: user2 }, JWT_ACCESS_SECRET);

    const r3 = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'User Three', user3, 'u3@example.com', 'pass123']
    );
    id3 = r3.rows[0].id;
    token3 = jwt.sign({ id: id3, username: user3 }, JWT_ACCESS_SECRET);

    // 3. Test Case 1: Blocking and Directory Filters
    console.log('\n--- Test Case 1: Directory Search Block Filtering ---');
    
    // User 1 blocks User 2
    const blockRes = await fetch(`http://localhost:${PORT}/api/users/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify({ username: user2 })
    });

    if (blockRes.status === 200) {
      console.log('✅ Block Action: User 1 successfully blocked User 2');
    } else {
      console.error('❌ Block Action: Failed status', blockRes.status);
      passed = false;
    }

    // Query Directory as User 1 (Blocked user 2 should not show up)
    const dirRes1 = await fetch(`http://localhost:${PORT}/api/users/directory`, {
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    const data1 = await dirRes1.json();
    const hasUser2InDir1 = data1.users.some(u => u.username === user2);
    const hasUser3InDir1 = data1.users.some(u => u.username === user3);

    if (!hasUser2InDir1 && hasUser3InDir1) {
      console.log('✅ Directory Search (Blocker): Correctly filters out blocked user (User 2)');
    } else {
      console.error('❌ Directory Search (Blocker): User 2 showing up or User 3 missing in search:', data1.users);
      passed = false;
    }

    // Query Directory as User 2 (Blocker user 1 should not show up)
    const dirRes2 = await fetch(`http://localhost:${PORT}/api/users/directory`, {
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    const data2 = await dirRes2.json();
    const hasUser1InDir2 = data2.users.some(u => u.username === user1);

    if (!hasUser1InDir2) {
      console.log('✅ Directory Search (Blocked): Correctly filters out blocker user (User 1)');
    } else {
      console.error('❌ Directory Search (Blocked): Blocker user 1 leaked in search results');
      passed = false;
    }

    // 4. Test Case 2: Call prevention
    console.log('\n--- Test Case 2: WebRTC Call Safeguard Rejections ---');
    
    // Connect Socket clients
    const socket1 = clientIo(`http://localhost:${PORT}`, { auth: { token: token1 } });
    const socket2 = clientIo(`http://localhost:${PORT}`, { auth: { token: token2 } });
    const socket3 = clientIo(`http://localhost:${PORT}`, { auth: { token: token3 } });

    await new Promise((resolve) => {
      let registered = 0;
      const onReg = () => {
        registered++;
        if (registered === 3) resolve();
      };
      socket1.on('connect', () => socket1.emit('register', user1, onReg));
      socket2.on('connect', () => socket2.emit('register', user2, onReg));
      socket3.on('connect', () => socket3.emit('register', user3, onReg));
    });

    // Caller User 1 calls User 2 (Should be blocked)
    await new Promise((resolve) => {
      socket1.emit('initiate_call', { to: user2 }, (res) => {
        if (!res.success && res.error.includes('blocked by user privacy settings')) {
          console.log('✅ Call block: Caller block successfully intercepted');
        } else {
          console.error('❌ Call block: Caller allowed to dial blocked peer:', res);
          passed = false;
        }
        resolve();
      });
    });

    // Caller User 2 calls User 1 (Should be blocked)
    await new Promise((resolve) => {
      socket2.emit('initiate_call', { to: user1 }, (res) => {
        if (!res.success && res.error.includes('blocked by user privacy settings')) {
          console.log('✅ Call block: Blocked peer dial successfully intercepted');
        } else {
          console.error('❌ Call block: Blocked peer allowed to dial blocker:', res);
          passed = false;
        }
        resolve();
      });
    });

    // Caller User 1 calls User 3 (Should be allowed)
    await new Promise((resolve) => {
      socket1.emit('initiate_call', { to: user3 }, (res) => {
        if (res.success) {
          console.log('✅ Call check: Call to unblocked user allowed');
        } else {
          console.error('❌ Call check: Call to unblocked user blocked:', res.error);
          passed = false;
        }
        resolve();
      });
    });

    socket1.disconnect();
    socket2.disconnect();
    socket3.disconnect();

    // 5. Test Case 3: Safety Abuse Reporting
    console.log('\n--- Test Case 3: Safety Abuse Reporting Logs ---');
    const reportRes = await fetch(`http://localhost:${PORT}/api/users/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token1}`
      },
      body: JSON.stringify({
        username: user2,
        reason: 'Harassment',
        description: 'Sent abusive messages non-stop'
      })
    });

    if (reportRes.status === 200) {
      console.log('✅ Report Action: User 1 reported User 2 successfully');
      
      // Verify in DB
      const dbReports = await query(
        `SELECT reason, description, status FROM reports 
         WHERE reporter_id = $1 AND reported_user_id = $2`,
        [id1, id2]
      );
      if (dbReports.rowCount === 1) {
        const rep = dbReports.rows[0];
        if (rep.reason === 'Harassment' && rep.description === 'Sent abusive messages non-stop' && rep.status.toUpperCase() === 'PENDING') {
          console.log('✅ Database Storage: Safety abuse report record successfully saved in PostgreSQL');
        } else {
          console.error('❌ Database Storage: Content mismatch in report record:', rep);
          passed = false;
        }
      } else {
        console.error('❌ Database Storage: Report record not found');
        passed = false;
      }
    } else {
      console.error('❌ Report Action: Failed status', reportRes.status);
      passed = false;
    }

    // Clean test records
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", [user1, user2, user3]);

  } catch (err) {
    console.error('❌ Blocking tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral block test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
