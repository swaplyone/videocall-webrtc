import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ClientIo } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import { validateCallTransition, CallStates } from './utils/callStateMachine.js';

const PORT = 5999;
const JWT_ACCESS_SECRET = 'swaply_jwt_access_secret_key_12345';

// Mock active mappings
const onlineUsers = new Map();
const socketToUser = new Map();
const activeCalls = new Map();

const DB_STATUS_MAP = {
  [CallStates.CALLING]: 'ringing',
  [CallStates.RINGING]: 'ringing',
  [CallStates.ACCEPTING]: 'ringing',
  [CallStates.CONNECTING]: 'ringing',
  [CallStates.CONNECTED]: 'active',
  [CallStates.RECONNECTING]: 'active',
  [CallStates.ENDED]: 'completed',
  [CallStates.REJECTED]: 'rejected',
  [CallStates.TIMEOUT]: 'missed',
  [CallStates.FAILED]: 'failed'
};

async function runTests() {
  console.log('Starting Swaply Call Reconnection Integration Tests...\n');

  // 1. Setup Ephemeral Socket.io Server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  async function transitionCall(sessionId, toState, extraData = {}) {
    const call = activeCalls.get(sessionId);
    const fromState = call ? call.status : CallStates.IDLE;

    if (!validateCallTransition(fromState, toState)) {
      return { success: false, error: `Invalid transition from ${fromState} to ${toState}` };
    }

    let updatedCall = call;
    if (toState === CallStates.CALLING) {
      updatedCall = {
        dbCallId: extraData.dbCallId || null,
        caller: extraData.caller || null,
        receiver: extraData.receiver || null,
        status: toState,
        startTime: Date.now()
      };
      activeCalls.set(sessionId, updatedCall);
    } else if (updatedCall) {
      updatedCall.status = toState;
    }

    if (!updatedCall) return { success: false, error: 'Call session not found' };

    // DB update
    const dbStatus = DB_STATUS_MAP[toState];
    if (dbStatus && updatedCall.dbCallId) {
      await query("UPDATE calls SET status = $1 WHERE id = $2", [dbStatus, updatedCall.dbCallId]);
    }

    // Broadcast change
    const cSock = onlineUsers.get(updatedCall.caller);
    const rSock = onlineUsers.get(updatedCall.receiver);
    if (cSock) io.to(cSock).emit('call_state_changed', { sessionId, state: toState });
    if (rSock) io.to(rSock).emit('call_state_changed', { sessionId, state: toState });

    // Cleanup terminal
    const isTerminal = [CallStates.ENDED, CallStates.FAILED, CallStates.REJECTED, CallStates.TIMEOUT].includes(toState);
    if (isTerminal) {
      activeCalls.delete(sessionId);
    }

    return { success: true };
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
      if (err) return next(new Error('Auth failed'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    socket.on('register', (username, cb) => {
      const cleanUsername = socket.user.username;
      onlineUsers.set(cleanUsername, socket.id);
      socketToUser.set(socket.id, cleanUsername);
      cb({ success: true });
    });

    socket.on('initiate_call', async ({ to }, callback) => {
      const caller = socketToUser.get(socket.id);
      const sessionId = `call_recon_${Date.now()}`;
      
      const callerRes = await query("SELECT id FROM users WHERE username = $1", [caller]);
      const receiverRes = await query("SELECT id FROM users WHERE username = $1", [to]);
      const insRes = await query(
        "INSERT INTO calls (caller_id, receiver_id, status) VALUES ($1, $2, 'ringing') RETURNING id",
        [callerRes.rows[0].id, receiverRes.rows[0].id]
      );
      const dbCallId = insRes.rows[0].id;

      await transitionCall(sessionId, CallStates.CALLING, {
        dbCallId,
        caller,
        receiver: to
      });

      await transitionCall(sessionId, CallStates.RINGING);

      const recSock = onlineUsers.get(to);
      if (recSock) {
        io.to(recSock).emit('incoming_call', { from: caller, sessionId });
      }

      callback({ success: true, sessionId });
    });

    socket.on('accept_call', async ({ sessionId }, callback) => {
      const username = socketToUser.get(socket.id);
      const call = activeCalls.get(sessionId);
      if (!call) return callback({ success: false });

      await transitionCall(sessionId, CallStates.ACCEPTING);
      await transitionCall(sessionId, CallStates.CONNECTING);

      const callerSock = onlineUsers.get(call.caller);
      if (callerSock) io.to(callerSock).emit('call_accepted', { sessionId });

      callback({ success: true });
    });

    socket.on('update_call_state', async ({ sessionId, state }, callback) => {
      const result = await transitionCall(sessionId, state);
      if (callback) callback(result);
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral Reconnection test server listening on port ${PORT}`);

  let passed = true;
  const user1 = 'usera';
  const user2 = 'userb';
  let token1, token2;
  let socket1, socket2;

  try {
    // 2. Setup mock users
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);
    const resA = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [`sec_${randomUUID()}`, 'User A', user1, 'usera@example.com', 'pass']
    );
    const resB = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [`sec_${randomUUID()}`, 'User B', user2, 'userb@example.com', 'pass']
    );

    token1 = jwt.sign({ id: resA.rows[0].id, username: user1 }, JWT_ACCESS_SECRET);
    token2 = jwt.sign({ id: resB.rows[0].id, username: user2 }, JWT_ACCESS_SECRET);

    // 3. Connect clients
    socket1 = ClientIo(`http://localhost:${PORT}`, { auth: { token: token1 } });
    socket2 = ClientIo(`http://localhost:${PORT}`, { auth: { token: token2 } });

    await new Promise((resolve) => socket1.on('connect', resolve));
    await new Promise((resolve) => socket2.on('connect', resolve));

    await new Promise((resolve) => socket1.emit('register', user1, resolve));
    await new Promise((resolve) => socket2.emit('register', user2, resolve));

    // Initiate Call Setup
    const initRes = await new Promise((resolve) => {
      socket1.emit('initiate_call', { to: user2 }, resolve);
    });
    const sessionId = initRes.sessionId;

    await new Promise((resolve) => {
      socket2.emit('accept_call', { sessionId }, resolve);
    });

    // CONNECTING -> CONNECTED
    await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.CONNECTED }, resolve);
    });

    let stateHistory = [];
    socket1.on('call_state_changed', ({ state }) => {
      stateHistory.push(state);
    });

    // Test Case 1: Trigger connection lost
    console.log('\n--- Test Case 1: Trigger Connection Lost (CONNECTED -> RECONNECTING) ---');
    stateHistory = [];
    const triggerReconRes = await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.RECONNECTING }, resolve);
    });

    if (triggerReconRes.success) {
      console.log('✅ Reconnection trigger approved by server');
    } else {
      console.error('❌ Failed to transition to RECONNECTING:', triggerReconRes);
      passed = false;
    }

    await new Promise((r) => setTimeout(r, 100));
    if (stateHistory.includes('RECONNECTING')) {
      console.log('✅ Broadcast sync verified: state is RECONNECTING');
    } else {
      console.error('❌ State change missing in broadcast. History:', stateHistory);
      passed = false;
    }

    // Test Case 2: Resume connection successfully
    console.log('\n--- Test Case 2: Resume Connection (RECONNECTING -> CONNECTED) ---');
    stateHistory = [];
    const resumeRes = await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.CONNECTED }, resolve);
    });

    if (resumeRes.success) {
      console.log('✅ Connection resumption approved by server');
    } else {
      console.error('❌ Resumption failed:', resumeRes);
      passed = false;
    }

    await new Promise((r) => setTimeout(r, 100));
    if (stateHistory.includes('CONNECTED')) {
      console.log('✅ Broadcast sync verified: state returned to CONNECTED');
    } else {
      console.error('❌ State change missing in broadcast. History:', stateHistory);
      passed = false;
    }

    // Test Case 3: Reconnection Failure (RECONNECTING -> FAILED)
    console.log('\n--- Test Case 3: Reconnection Failure (Max Retries Expired) ---');
    // First trigger disconnect again
    await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.RECONNECTING }, resolve);
    });

    stateHistory = [];
    const failRes = await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.FAILED }, resolve);
    });

    if (failRes.success) {
      console.log('✅ Server approved FAILED state transition');
    } else {
      console.error('❌ FAILED state transition rejected:', failRes);
      passed = false;
    }

    await new Promise((r) => setTimeout(r, 100));
    if (stateHistory.includes('FAILED')) {
      console.log('✅ Broadcast sync verified: state transitions to FAILED and session ended');
    } else {
      console.error('❌ FAILED state change missing in broadcast. History:', stateHistory);
      passed = false;
    }

    // Verify database row reflects 'failed'
    const dbRes = await query("SELECT status FROM calls WHERE id = (SELECT max(id) FROM calls)");
    if (dbRes.rows[0].status === 'failed') {
      console.log("✅ Database verification: call status is 'failed' in PostgreSQL");
    } else {
      console.error("❌ Database status mismatch. Expected 'failed', Got:", dbRes.rows[0].status);
      passed = false;
    }

    // Clean DB records
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);

  } catch (err) {
    console.error('❌ Reconnection tests encountered error:', err);
    passed = false;
  } finally {
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral Reconnection test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);

    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
