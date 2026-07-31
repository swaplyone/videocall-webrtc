import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ClientIo } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import { validateCallTransition, CallStates } from './utils/callStateMachine.js';

const PORT = 5999;
const JWT_ACCESS_SECRET = 'swaply_jwt_access_secret_key_12345';

// Mock active mappings and server variables
const onlineUsers = new Map();
const socketToUser = new Map();
const activeCalls = new Map();
const activeSessions = new Map();

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
  console.log('Starting Swaply Call State Machine Integration Tests...\n');

  // 1. Start Ephemeral Socket.io Server
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // Authoritative State transition helper
  async function transitionCall(sessionId, toState, extraData = {}) {
    const call = activeCalls.get(sessionId);
    const fromState = call ? call.status : CallStates.IDLE;

    if (!validateCallTransition(fromState, toState)) {
      console.warn(`[TestServer] Blocked invalid transition: ${fromState} -> ${toState}`);
      return { success: false, error: `Invalid transition from ${fromState} to ${toState}` };
    }

    console.log(`[TestServer] Session ${sessionId}: ${fromState} -> ${toState}`);

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

    // DB update mockup
    const dbStatus = DB_STATUS_MAP[toState];
    if (dbStatus && updatedCall.dbCallId) {
      await query("UPDATE calls SET status = $1 WHERE id = $2", [dbStatus, updatedCall.dbCallId]);
    }

    // Broadcast change
    const cSock = onlineUsers.get(updatedCall.caller);
    const rSock = onlineUsers.get(updatedCall.receiver);
    if (cSock) io.to(cSock).emit('call_state_changed', { sessionId, state: toState });
    if (rSock) io.to(rSock).emit('call_state_changed', { sessionId, state: toState });

    // Terminal cleanup
    const isTerminal = [CallStates.ENDED, CallStates.FAILED, CallStates.REJECTED, CallStates.TIMEOUT].includes(toState);
    if (isTerminal) {
      activeCalls.delete(sessionId);
    }

    return { success: true };
  }

  // Socket middleware
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
      const sessionId = `call_${Date.now()}`;
      
      // Simulate DB write
      const callerRes = await query("SELECT id FROM users WHERE username = $1", [caller]);
      const receiverRes = await query("SELECT id FROM users WHERE username = $1", [to]);
      const insRes = await query(
        "INSERT INTO calls (caller_id, receiver_id, status) VALUES ($1, $2, 'ringing') RETURNING id",
        [callerRes.rows[0].id, receiverRes.rows[0].id]
      );
      const dbCallId = insRes.rows[0].id;

      // IDLE -> CALLING
      await transitionCall(sessionId, CallStates.CALLING, {
        dbCallId,
        caller,
        receiver: to
      });

      // CALLING -> RINGING
      await transitionCall(sessionId, CallStates.RINGING);

      // Notify receiver
      const recSock = onlineUsers.get(to);
      if (recSock) {
        io.to(recSock).emit('incoming_call', { from: caller, sessionId });
      }

      callback({ success: true, sessionId });
    });

    socket.on('accept_call', async ({ sessionId }, callback) => {
      const username = socketToUser.get(socket.id);
      const call = activeCalls.get(sessionId);
      if (!call || call.receiver !== username) return callback({ success: false });

      // RINGING -> ACCEPTING
      await transitionCall(sessionId, CallStates.ACCEPTING);
      
      // ACCEPTING -> CONNECTING
      await transitionCall(sessionId, CallStates.CONNECTING);
      
      // Notify caller
      const callerSock = onlineUsers.get(call.caller);
      if (callerSock) io.to(callerSock).emit('call_accepted', { sessionId });

      callback({ success: true });
    });

    socket.on('update_call_state', async ({ sessionId, state }, callback) => {
      const result = await transitionCall(sessionId, state);
      if (callback) callback(result);
    });

    socket.on('terminate_call', async ({ sessionId }) => {
      const call = activeCalls.get(sessionId);
      if (call) {
        const peer = call.caller === socketToUser.get(socket.id) ? call.receiver : call.caller;
        const peerSock = onlineUsers.get(peer);
        if (peerSock) io.to(peerSock).emit('call_terminated', { sessionId });
        await transitionCall(sessionId, CallStates.ENDED);
      }
    });
  });

  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral State Machine test server listening on port ${PORT}`);

  let passed = true;
  const user1 = 'usera';
  const user2 = 'userb';
  let token1, token2;
  let socket1, socket2;

  try {
    // 2. Setup mock users
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);
    const res1 = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [`sec_${randomUUID()}`, 'User A', user1, 'usera@example.com', 'pass']
    );
    const res2 = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [`sec_${randomUUID()}`, 'User B', user2, 'userb@example.com', 'pass']
    );

    token1 = jwt.sign({ id: res1.rows[0].id, username: user1 }, JWT_ACCESS_SECRET);
    token2 = jwt.sign({ id: res2.rows[0].id, username: user2 }, JWT_ACCESS_SECRET);

    // 3. Connect clients
    socket1 = ClientIo(`http://localhost:${PORT}`, { auth: { token: token1 } });
    socket2 = ClientIo(`http://localhost:${PORT}`, { auth: { token: token2 } });

    await new Promise((resolve) => socket1.on('connect', resolve));
    await new Promise((resolve) => socket2.on('connect', resolve));

    await new Promise((resolve) => socket1.emit('register', user1, resolve));
    await new Promise((resolve) => socket2.emit('register', user2, resolve));

    let stateHistory = [];
    socket1.on('call_state_changed', ({ state }) => {
      stateHistory.push(state);
    });

    // Test Case 1: Call initiation
    console.log('\n--- Test Case 1: Initiate Call & Ringing ---');
    const initRes = await new Promise((resolve) => {
      socket1.emit('initiate_call', { to: user2 }, resolve);
    });

    if (initRes.success && initRes.sessionId) {
      console.log('✅ Call initiated with Session:', initRes.sessionId);
    } else {
      console.error('❌ Call initiation failed:', initRes);
      passed = false;
    }
    const sessionId = initRes.sessionId;

    // Wait a brief moment for transition events
    await new Promise((r) => setTimeout(r, 100));
    if (stateHistory.includes('CALLING') && stateHistory.includes('RINGING')) {
      console.log('✅ Verified server transitioned IDLE -> CALLING -> RINGING');
    } else {
      console.error('❌ State transitions missing. State history:', stateHistory);
      passed = false;
    }

    // Test Case 2: Accept Call
    console.log('\n--- Test Case 2: Accept Call -> Connecting ---');
    stateHistory = [];
    const acceptRes = await new Promise((resolve) => {
      socket2.emit('accept_call', { sessionId }, resolve);
    });

    if (acceptRes.success) {
      console.log('✅ Receiver accepted the call');
    } else {
      console.error('❌ Accept call rejected:', acceptRes);
      passed = false;
    }

    await new Promise((r) => setTimeout(r, 100));
    if (stateHistory.includes('ACCEPTING') && stateHistory.includes('CONNECTING')) {
      console.log('✅ Verified server transitioned RINGING -> ACCEPTING -> CONNECTING');
    } else {
      console.error('❌ Accept transitions missing. State history:', stateHistory);
      passed = false;
    }

    // Test Case 3: Connect Peer Connection
    console.log('\n--- Test Case 3: Upgrade CONNECTING -> CONNECTED ---');
    stateHistory = [];
    const connectStateRes = await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.CONNECTED }, resolve);
    });

    if (connectStateRes.success) {
      console.log('✅ Client successfully updated state to CONNECTED');
    } else {
      console.error('❌ Client state update failed:', connectStateRes);
      passed = false;
    }

    await new Promise((r) => setTimeout(r, 100));
    if (stateHistory.includes('CONNECTED')) {
      console.log('✅ Verified state changed to CONNECTED');
    } else {
      console.error('❌ CONNECTED state not broadcasted. State history:', stateHistory);
      passed = false;
    }

    // Test Case 4: Invalid Transition Attempt
    console.log('\n--- Test Case 4: Reject Invalid State Transition (CONNECTED -> RINGING) ---');
    const invalidRes = await new Promise((resolve) => {
      socket1.emit('update_call_state', { sessionId, state: CallStates.RINGING }, resolve);
    });

    if (!invalidRes.success && invalidRes.error.includes('Invalid transition')) {
      console.log('✅ Server correctly blocked invalid state transition');
    } else {
      console.error('❌ Server failed to block invalid transition. Response:', invalidRes);
      passed = false;
    }

    // Test Case 5: Call Termination
    console.log('\n--- Test Case 5: End call (CONNECTED -> ENDED) ---');
    stateHistory = [];
    socket1.emit('terminate_call', { sessionId });

    await new Promise((r) => setTimeout(r, 200));
    if (stateHistory.includes('ENDED')) {
      console.log('✅ Verified call successfully transitioned to ENDED and cleared');
    } else {
      console.error('❌ ENDED state not received. State history:', stateHistory);
      passed = false;
    }

    // Clean DB records
    await query("DELETE FROM users WHERE username IN ($1, $2)", [user1, user2]);

  } catch (err) {
    console.error('❌ State machine tests encountered error:', err);
    passed = false;
  } finally {
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral State Machine test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);

    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
