import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import { query } from './db.js';
import { randomUUID } from 'crypto';

const PORT = 5999;

async function runTests() {
  console.log('Starting Swaply User Presence Integration Tests...\n');

  // 1. Setup in-memory states (mirroring server.js)
  const onlineUsers = new Map();
  const socketToUser = new Map();
  const activeSessions = new Map();

  async function updateUserPresence(username, status) {
    try {
      const userExists = await query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (userExists.rowCount > 0) {
        await query(
          "UPDATE users SET online_status = $1, last_seen = NOW() WHERE username = $2",
          [status, username]
        );
      }
    } catch (err) {
      console.error(`Error updating presence for ${username}:`, err);
    }
  }

  // 2. Setup ephemeral test server
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    socket.on('register', async (username, callback) => {
      const cleanUsername = username.trim();
      
      if (!activeSessions.has(cleanUsername)) {
        activeSessions.set(cleanUsername, new Set());
      }
      activeSessions.get(cleanUsername).add(socket.id);
      onlineUsers.set(cleanUsername, socket.id);
      socketToUser.set(socket.id, cleanUsername);

      if (activeSessions.get(cleanUsername).size === 1) {
        await updateUserPresence(cleanUsername, 'online');
      }
      callback({ success: true });
    });

    socket.on('set_presence', async (status, callback) => {
      const username = socketToUser.get(socket.id);
      if (username) {
        await updateUserPresence(username, status);
        callback({ success: true });
      } else {
        callback({ success: false });
      }
    });

    socket.on('disconnect', async () => {
      const username = socketToUser.get(socket.id);
      if (username) {
        const sessions = activeSessions.get(username);
        if (sessions) {
          sessions.delete(socket.id);
          if (sessions.size === 0) {
            activeSessions.delete(username);
            onlineUsers.delete(username);
            await updateUserPresence(username, 'offline');
          }
        }
        socketToUser.delete(socket.id);
      }
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral presence test server listening on port ${PORT}`);

  let passed = true;
  const testUsername = 'presenceuser';

  try {
    // 3. Setup test user in database
    await query('DELETE FROM users WHERE username = $1', [testUsername]);
    await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [`sec_${randomUUID()}`, 'Presence Tester', testUsername, 'presence@example.com', 'hashed123']
    );

    // Helper to query current status from DB
    const getDbStatus = async () => {
      const res = await query('SELECT online_status, last_seen FROM users WHERE username = $1', [testUsername]);
      return res.rows[0];
    };

    // Assert initial status
    let statusInfo = await getDbStatus();
    if (statusInfo.online_status === 'offline') {
      console.log('✅ Initial state: User is offline in DB');
    } else {
      console.error('❌ Initial state: User should be offline');
      passed = false;
    }

    // 4. Connect Client Socket 1 (Tab 1)
    console.log('\n--- Connect Tab 1 ---');
    const client1 = clientIo(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client1.on('connect', () => {
        client1.emit('register', testUsername, async () => {
          statusInfo = await getDbStatus();
          if (statusInfo.online_status === 'online') {
            console.log('✅ Tab 1 Registered: User status is "online" in database');
            resolve();
          } else {
            console.error('❌ Tab 1 Registered: User status is', statusInfo.online_status);
            passed = false;
            resolve();
          }
        });
      });
    });

    // 5. Connect Client Socket 2 (Tab 2)
    console.log('\n--- Connect Tab 2 (Simulating Multi-tab) ---');
    const client2 = clientIo(`http://localhost:${PORT}`);
    
    await new Promise((resolve) => {
      client2.on('connect', () => {
        client2.emit('register', testUsername, async () => {
          statusInfo = await getDbStatus();
          if (statusInfo.online_status === 'online') {
            console.log('✅ Tab 2 Registered: User status remains "online" in database');
            resolve();
          } else {
            console.error('❌ Tab 2 Registered: User status is', statusInfo.online_status);
            passed = false;
            resolve();
          }
        });
      });
    });

    // 6. Disconnect Client Socket 1 (Simulating closing Tab 1)
    console.log('\n--- Disconnect Tab 1 ---');
    client1.disconnect();
    // Wait for server to process disconnect
    await new Promise((resolve) => setTimeout(resolve, 500));

    statusInfo = await getDbStatus();
    if (statusInfo.online_status === 'online') {
      console.log('✅ Tab 1 Closed: User status remains "online" (due to active Tab 2)');
    } else {
      console.error('❌ Tab 1 Closed: User status changed incorrectly to', statusInfo.online_status);
      passed = false;
    }

    // 7. Manual Status Update (Set Away)
    console.log('\n--- Set Manual Presence Status (Away) ---');
    await new Promise((resolve) => {
      client2.emit('set_presence', 'away', async () => {
        statusInfo = await getDbStatus();
        if (statusInfo.online_status === 'away') {
          console.log('✅ Status Update: successfully set user status to "away" in database');
        } else {
          console.error('❌ Status Update: failed, status is', statusInfo.online_status);
          passed = false;
        }
        resolve();
      });
    });

    // 8. Disconnect Client Socket 2 (Simulating closing Tab 2 - last connection)
    console.log('\n--- Disconnect Tab 2 (Last Connection) ---');
    const timeBeforeDisconnect = new Date();
    client2.disconnect();
    // Wait for server to process disconnect
    await new Promise((resolve) => setTimeout(resolve, 500));

    statusInfo = await getDbStatus();
    if (statusInfo.online_status === 'offline') {
      console.log('✅ Tab 2 Closed: User status is "offline" in database');
      const lastSeenTime = new Date(statusInfo.last_seen);
      if (lastSeenTime >= timeBeforeDisconnect) {
        console.log('✅ Last Seen: Successfully updated timestamp on offline transition');
      } else {
        console.error('❌ Last Seen: Timestamp did not update. Before:', timeBeforeDisconnect, 'Got:', lastSeenTime);
        passed = false;
      }
    } else {
      console.error('❌ Tab 2 Closed: User status should be offline, got:', statusInfo.online_status);
      passed = false;
    }

    // Clean up DB test user
    await query('DELETE FROM users WHERE username = $1', [testUsername]);

  } catch (err) {
    console.error('❌ Presence integration tests encountered error:', err);
    passed = false;
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral presence test server closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    process.exit(passed ? 0 : 1);
  }
}

runTests();
