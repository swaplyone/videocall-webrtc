import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { moderateMessage } from './moderator.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import callRoutes from './routes/callRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import pool, { query } from './db.js';
import { securityHeaders } from './middleware/securityMiddleware.js';
import { createRateLimiter } from './middleware/rateLimitMiddleware.js';
import { validateCallTransition, CallStates } from './utils/callStateMachine.js';

const app = express();

// Secure Local Network CORS Resolver for Development
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const localNetworkRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):5173$/;

const checkOrigin = (origin, callback) => {
  if (
    !origin || 
    allowedOrigins.includes(origin) || 
    localNetworkRegex.test(origin) ||
    (process.env.NODE_ENV === 'production' && origin.endsWith('.netlify.app'))
  ) {
    callback(null, true);
  } else {
    callback(new Error('Blocked by Swaply CORS Policy'));
  }
};

app.use(cors({
  origin: checkOrigin,
  credentials: true
}));

// Apply Helmet-style security headers globally
app.use(securityHeaders);

// Body limit restrictions (buffer-overflow protection)
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Define rate limiters
const globalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests, please try again later.'
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 1000,
  message: 'Too many login or registration attempts, please try again after 15 minutes.'
});

// Apply rate limiters to routes
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/friends', friendRoutes);

// System Health Checks Telemetry Endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    resources: {
      cpuUsage: process.cpuUsage(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      },
      dbPool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    }
  };

  try {
    await query('SELECT 1');
    health.database = 'UP';
  } catch (err) {
    health.status = 'DOWN';
    health.database = `DOWN: ${err.message}`;
  }

  res.status(health.status === 'UP' ? 200 : 503).json(health);
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingInterval: 25000,
  pingTimeout: 20000,
  cors: {
    origin: checkOrigin,
    methods: ['GET', 'POST']
  }
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Application State
const onlineUsers = new Map(); // username -> socketId
const socketToUser = new Map(); // socketId -> username
const activeCalls = new Map(); // sessionId -> { caller, receiver, status: 'ringing'|'active' }
const activeSessions = new Map(); // username -> Set of socketIds
const activeCallReconnectionTimeouts = new Map(); // username -> { timeoutId, sessionId }

app.set('socketio', io);
app.set('onlineUsers', onlineUsers);
app.set('activeCalls', activeCalls);

// Call State Machine Mapping
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

/**
 * Transitions a call session state authoritatively on the server.
 */
async function transitionCall(sessionId, toState, extraData = {}) {
  const call = activeCalls.get(sessionId);
  const fromState = call ? call.status : CallStates.IDLE;

  if (!validateCallTransition(fromState, toState)) {
    console.warn(`[StateMachine] Blocked invalid transition in session ${sessionId}: ${fromState} -> ${toState}`);
    return { success: false, error: `Invalid transition from ${fromState} to ${toState}` };
  }

  console.log(`[StateMachine] Session ${sessionId} transitioning: ${fromState} -> ${toState}`);

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
    if (toState === CallStates.CONNECTED && fromState !== CallStates.RECONNECTING) {
      updatedCall.startTime = Date.now();
    }
  }

  if (!updatedCall) {
    return { success: false, error: 'Call session not found' };
  }

  // Update DB status
  const dbStatus = DB_STATUS_MAP[toState];
  if (dbStatus && updatedCall.dbCallId) {
    try {
      if (toState === CallStates.ENDED || toState === CallStates.FAILED || toState === CallStates.TIMEOUT) {
        const duration = updatedCall.startTime ? Math.round((Date.now() - updatedCall.startTime) / 1000) : 0;
        await query(
          "UPDATE calls SET status = $1, ended_at = NOW(), duration = $2 WHERE id = $3",
          [dbStatus, duration, updatedCall.dbCallId]
        );
      } else if (toState === CallStates.REJECTED) {
        await query(
          "UPDATE calls SET status = $1, ended_at = NOW(), duration = 0 WHERE id = $2",
          [dbStatus, updatedCall.dbCallId]
        );
      } else {
        await query(
          "UPDATE calls SET status = $1 WHERE id = $2",
          [dbStatus, updatedCall.dbCallId]
        );
      }
    } catch (err) {
      console.error(`[StateMachine] Database sync failed for ${sessionId}:`, err);
    }
  }

  // Emit event to peers
  const callerSocketId = onlineUsers.get(updatedCall.caller);
  const receiverSocketId = onlineUsers.get(updatedCall.receiver);

  if (callerSocketId) {
    io.to(callerSocketId).emit('call_state_changed', { sessionId, state: toState, dbCallId: updatedCall.dbCallId });
  }
  if (receiverSocketId) {
    io.to(receiverSocketId).emit('call_state_changed', { sessionId, state: toState, dbCallId: updatedCall.dbCallId });
  }

  // Clean up if terminal state
  const isTerminal = [CallStates.ENDED, CallStates.FAILED, CallStates.REJECTED, CallStates.TIMEOUT].includes(toState);
  if (isTerminal) {
    const callerSocket = io.sockets.sockets.get(callerSocketId);
    const receiverSocket = io.sockets.sockets.get(receiverSocketId);
    if (callerSocket) callerSocket.leave(sessionId);
    if (receiverSocket) receiverSocket.leave(sessionId);
    activeCalls.delete(sessionId);
  }

  return { success: true };
}

// Helper to write online status and timestamp to database
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
    console.error(`Error updating user presence for ${username}:`, err);
  }
}

// Helper to get user ID by username
async function getUserIdByUsername(username) {
  try {
    const res = await query('SELECT id FROM users WHERE username = $1', [username]);
    return res.rowCount > 0 ? res.rows[0].id : null;
  } catch (err) {
    console.error(`Error fetching user ID for ${username}:`, err);
    return null;
  }
}

// Helper to find or create conversation between two users
async function getOrCreateConversation(userId1, userId2) {
  try {
    // 1. Check if conversation already exists
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

    // 2. Create new conversation
    const convRes = await query(
      'INSERT INTO conversations (created_at, updated_at) VALUES (NOW(), NOW()) RETURNING id'
    );
    const convId = convRes.rows[0].id;

    // 3. Add members
    await query(
      'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [convId, userId1, userId2]
    );

    return convId;
  } catch (err) {
    console.error(`Error getting or creating conversation between ${userId1} and ${userId2}:`, err);
    throw err;
  }
}

// Default Admin Moderation Configuration
let moderationConfig = {
  blockPhoneNumbers: true,
  blockEmails: true,
  blockSocials: true
};

// Socket.io JWT Authentication Handshake Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    const secret = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
      socket.user = decoded; // Store { id, username }
      next();
    });
  } else {
    // Fallback for Phase 1 anonymous connections
    socket.user = null;
    next();
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Socket-level event rate limiting guard (30 events/sec limit)
  const rateLimitState = { count: 0, startTime: Date.now() };
  socket.use(([event, ...args], next) => {
    const now = Date.now();
    if (now - rateLimitState.startTime > 1000) {
      rateLimitState.count = 1;
      rateLimitState.startTime = now;
      return next();
    }

    rateLimitState.count++;
    if (rateLimitState.count > 30) {
      console.warn(`[Socket Rate Limit Alert] Socket ${socket.id} blocked: ${rateLimitState.count} events/sec`);
      socket.emit('error', 'Rate limit exceeded. Connection throttled.');
      return; // drop event
    }
    next();
  });

  // 1. User Registration
  socket.on('register', async (username, callback) => {
    // If authenticated via JWT, enforce the authenticated username
    const cleanUsername = socket.user ? socket.user.username : (username && typeof username === 'string' ? username.trim() : null);

    if (!cleanUsername) {
      return callback({ success: false, error: 'Invalid username' });
    }
    if (cleanUsername.length < 3) {
      return callback({ success: false, error: 'Username must be at least 3 characters' });
    }

    // Handle takeover for multi-tab / browser refreshes
    if (onlineUsers.has(cleanUsername) && onlineUsers.get(cleanUsername) !== socket.id) {
      if (socket.user) {
        const oldSocketId = onlineUsers.get(cleanUsername);
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          console.log(`Disconnecting old duplicate session for ${cleanUsername}`);
          oldSocket.disconnect();
        }
      } else {
        return callback({ success: false, error: 'Username already taken' });
      }
    }

    // Record session socket ID
    if (!activeSessions.has(cleanUsername)) {
      activeSessions.set(cleanUsername, new Set());
    }
    activeSessions.get(cleanUsername).add(socket.id);

    onlineUsers.set(cleanUsername, socket.id);
    socketToUser.set(socket.id, cleanUsername);
    console.log(`User registered: ${cleanUsername} (${socket.id}) ${socket.user ? '[JWT Auth]' : '[Anon]'}`);

    // Reconnection Recovery: Cancel call termination timeout if the user reconnected during the grace period
    if (activeCallReconnectionTimeouts.has(cleanUsername)) {
      const { timeoutId, sessionId } = activeCallReconnectionTimeouts.get(cleanUsername);
      clearTimeout(timeoutId);
      activeCallReconnectionTimeouts.delete(cleanUsername);
      console.log(`[Reconnection] Cancelled call termination timeout. User ${cleanUsername} reconnected during grace period.`);
      
      const call = activeCalls.get(sessionId);
      if (call) {
        const peer = call.caller === cleanUsername ? call.receiver : call.caller;
        const peerSocketId = onlineUsers.get(peer);
        if (peerSocketId) {
          io.to(peerSocketId).emit('peer_reconnected', { username: cleanUsername });
        }
        socket.emit('call_restored', {
          sessionId,
          remoteUser: peer,
          isCaller: call.caller === cleanUsername,
          status: call.status
        });
      }
    }

    // Update database status to 'online' on first tab connection
    if (activeSessions.get(cleanUsername).size === 1) {
      await updateUserPresence(cleanUsername, 'online');
    }
    
    callback({ success: true });
    // Broadcast updated user list
    broadcastUserList();
  });

  // 2. Initiate Call
  socket.on('initiate_call', async ({ to }, callback) => {
    if (typeof callback !== 'function') return;
    if (!to || typeof to !== 'string') {
      return callback({ success: false, error: 'Invalid recipient' });
    }
    const caller = socketToUser.get(socket.id);
    if (!caller) {
      return callback({ success: false, error: 'Unauthenticated' });
    }

    if (!onlineUsers.has(to)) {
      return callback({ success: false, error: 'User is offline' });
    }

    // Resolve user IDs and verify privacy blocks
    let callerId = null;
    let receiverId = null;
    try {
      callerId = await getUserIdByUsername(caller);
      receiverId = await getUserIdByUsername(to);
      if (callerId && receiverId) {
        const blockCheck = await query(
          `SELECT 1 FROM blocks 
           WHERE (blocker_id = $1 AND blocked_user_id = $2) 
              OR (blocker_id = $2 AND blocked_user_id = $1)`,
          [callerId, receiverId]
        );
        if (blockCheck.rowCount > 0) {
          console.log(`Call BLOCKED: block relation exists between ${caller} and ${to}`);
          return callback({ success: false, error: 'Call blocked by user privacy settings' });
        }

        const friendshipCheck = await query(
          `SELECT 1 FROM friendships 
           WHERE (user_id = $1 AND friend_id = $2) 
              OR (user_id = $2 AND friend_id = $1)`,
          [callerId, receiverId]
        );
        if (friendshipCheck.rowCount === 0) {
          console.log(`Call BLOCKED: ${caller} and ${to} are not friends`);
          return callback({ success: false, error: 'Call unauthorized. You can only call accepted friends.' });
        }
      }
    } catch (err) {
      console.error('Error verifying privacy blocks on call setup:', err);
    }

    const receiverSocketId = onlineUsers.get(to);
    
    // Generate secure unique call ID
    const sessionId = `call_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    
    // Log to PostgreSQL (if users exist in DB)
    let dbCallId = null;
    try {
      if (callerId && receiverId) {
        const insRes = await query(
          `INSERT INTO calls (caller_id, receiver_id, status, started_at)
           VALUES ($1, $2, 'ringing', NOW())
           RETURNING id`,
          [callerId, receiverId]
        );
        dbCallId = insRes.rows[0].id;
      }
    } catch (err) {
      console.error('Error logging call initiation in DB:', err);
    }

    // State Machine Transition: IDLE -> CALLING
    const transitionRes1 = await transitionCall(sessionId, CallStates.CALLING, {
      dbCallId,
      caller,
      receiver: to
    });

    if (!transitionRes1.success) {
      return callback({ success: false, error: transitionRes1.error });
    }

    // Immediately transition CALLING -> RINGING since receiver is online and gets notified
    const transitionRes2 = await transitionCall(sessionId, CallStates.RINGING);
    if (!transitionRes2.success) {
      return callback({ success: false, error: transitionRes2.error });
    }

    // Notify receiver
    io.to(receiverSocketId).emit('incoming_call', {
      from: caller,
      sessionId
    });

    callback({ success: true, sessionId });
  });

  // 3. Accept Call
  socket.on('accept_call', async ({ sessionId }, callback) => {
    if (!sessionId || typeof sessionId !== 'string') {
      if (typeof callback === 'function') callback({ success: false, error: 'Invalid sessionId' });
      return;
    }
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (!call) {
      if (typeof callback === 'function') callback({ success: false, error: 'Call session not found' });
      return;
    }

    // Authorization check: Only the intended recipient can accept
    if (call.receiver !== username) {
      if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized to accept this call' });
      return;
    }

    // State Machine Transition: RINGING -> ACCEPTING
    const transitionRes1 = await transitionCall(sessionId, CallStates.ACCEPTING);
    if (!transitionRes1.success) {
      if (typeof callback === 'function') callback({ success: false, error: transitionRes1.error });
      return;
    }

    const callerSocketId = onlineUsers.get(call.caller);
    
    // Join both sockets to the call room
    socket.join(sessionId);
    const callerSocket = io.sockets.sockets.get(callerSocketId);
    if (callerSocket) {
      callerSocket.join(sessionId);
    }

    // State Machine Transition: ACCEPTING -> CONNECTING
    const transitionRes2 = await transitionCall(sessionId, CallStates.CONNECTING);
    if (!transitionRes2.success) {
      if (typeof callback === 'function') callback({ success: false, error: transitionRes2.error });
      return;
    }

    // Notify caller that call was accepted
    io.to(callerSocketId).emit('call_accepted', { sessionId });
    
    if (typeof callback === 'function') callback({ success: true });
  });

  // 4. Reject Call
  socket.on('reject_call', async ({ sessionId }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (call && call.receiver === username) {
      // State Machine Transition: RINGING -> REJECTED
      await transitionCall(sessionId, CallStates.REJECTED);
      
      const callerSocketId = onlineUsers.get(call.caller);
      io.to(callerSocketId).emit('call_rejected', { sessionId });
    }
  });

  // 5. Terminate Call
  socket.on('terminate_call', async ({ sessionId }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (call && (call.caller === username || call.receiver === username)) {
      // Notify peer before clearing state
      const peer = call.caller === username ? call.receiver : call.caller;
      const peerSocketId = onlineUsers.get(peer);
      
      io.to(peerSocketId).emit('call_terminated', { sessionId });

      // State Machine Transition: CURRENT -> ENDED
      await transitionCall(sessionId, CallStates.ENDED);
    }
  });

  // 5.5 Update Call State (Client initiated connection/failure notifications)
  socket.on('update_call_state', async ({ sessionId, state }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    if (!state || typeof state !== 'string') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (call && (call.caller === username || call.receiver === username)) {
      const result = await transitionCall(sessionId, state);
      if (!result.success) {
        console.warn(`[StateMachine] Socket rejected state update to ${state}: ${result.error}`);
      }
    }
  });

  // 6. WebRTC Signaling Relayer with Screen-Sharing Protections
  socket.on('signal', ({ sessionId, sdp, candidate, type }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    const activeStates = [
      CallStates.ACCEPTING,
      CallStates.CONNECTING,
      CallStates.CONNECTED,
      CallStates.RECONNECTING,
      'active'
    ];

    if (!call || !activeStates.includes(call.status)) {
      return; // Call is not in an active signaling state
    }

    // Authorization: Only the two participants of the call can signal
    if (call.caller !== username && call.receiver !== username) {
      console.warn(`Unauthorized signaling attempt on session ${sessionId} by ${username}`);
      return;
    }

    // Safely extract raw SDP text from either raw string or nested object structure
    let sdpText = '';
    if (sdp) {
      if (typeof sdp === 'string') {
        sdpText = sdp;
      } else if (typeof sdp === 'object' && typeof sdp.sdp === 'string') {
        sdpText = sdp.sdp;
      }
    }

    // Security Check: Screen-Sharing Detection & Block in SDP
    if (sdpText) {
      // 1. Check for multiple video tracks (which implies adding screen share stream in addition to webcam)
      const videoTracksCount = (sdpText.match(/^m=video/gm) || []).length;
      if (videoTracksCount > 1) {
        console.warn(`Blocked signaling SDP: multiple video tracks detected (potential screen sharing) from ${username}`);
        socket.emit('security_violation', {
          error: 'Screen sharing is disabled on Swaply for privacy reasons.'
        });
        return;
      }

      // 2. Reject explicit screen-share or display media headers/keywords if manually constructed
      if (sdpText.toLowerCase().includes('mozilla:screencast') || sdpText.toLowerCase().includes('chrome:screen')) {
        console.warn(`Blocked signaling SDP: screen recording/sharing keywords detected from ${username}`);
        socket.emit('security_violation', {
          error: 'Screen sharing or browser capture signaling is rejected.'
        });
        return;
      }
    }

    // Determine recipient
    const recipient = call.caller === username ? call.receiver : call.caller;
    const recipientSocketId = onlineUsers.get(recipient);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('signal', {
        sessionId,
        sdp,
        candidate,
        type
      });
    }
  });

  // 7. Messaging with Server-Side Moderation Pipeline
  socket.on('send_message', async ({ sessionId, text }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    if (!text || typeof text !== 'string') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (!call || !['CONNECTED', 'active', 'RECONNECTING', 'CONNECTING'].includes(call.status)) {
      return; // Session must be in an active state
    }

    // Auth validation
    if (call.caller !== username && call.receiver !== username) {
      return;
    }

    console.log(`Moderating message from ${username} in session ${sessionId}`);

    // Run message through server-side moderation
    const moderationResult = moderateMessage(text, moderationConfig);

    if (!moderationResult.safe) {
      console.log(`Message BLOCKED from ${username}: ${moderationResult.error}`);
      // Show warning only to the sender, do not deliver message to the room
      socket.emit('message_rejected', {
        text,
        error: moderationResult.error
      });
      return;
    }

    // Persist safe message in PostgreSQL (if users exist in DB)
    try {
      const senderId = await getUserIdByUsername(username);
      const recipientUsername = call.caller === username ? call.receiver : call.caller;
      const recipientId = await getUserIdByUsername(recipientUsername);

      if (senderId && recipientId) {
        const friendshipCheck = await query(
          `SELECT 1 FROM friendships 
           WHERE (user_id = $1 AND friend_id = $2) 
              OR (user_id = $2 AND friend_id = $1)`,
          [senderId, recipientId]
        );
        if (friendshipCheck.rowCount === 0) {
          console.log(`Message BLOCKED: ${username} and ${recipientUsername} are not friends`);
          socket.emit('message_rejected', {
            text,
            error: 'You can only message accepted friends'
          });
          return;
        }
      }

      if (senderId && recipientId) {
        const convId = await getOrCreateConversation(senderId, recipientId);
        await query(
          `INSERT INTO messages (conversation_id, sender_id, message, moderation_status, created_at)
           VALUES ($1, $2, $3, 'APPROVED', NOW())`,
          [convId, senderId, text]
        );
      }
    } catch (err) {
      console.error('Error saving message in DB:', err);
    }

    // Message is safe, forward it to the other participant in the room
    const recipient = call.caller === username ? call.receiver : call.caller;
    const recipientSocketId = onlineUsers.get(recipient);

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('receive_message', {
        sender: username,
        text,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Echo back to sender for confirmation
      socket.emit('message_delivered', {
        sender: username,
        text,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });

  // 8. Warning Relay (e.g. screenshot deterrence / focus loss notifications)
  socket.on('focus_changed', ({ sessionId, hasFocus }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    if (typeof hasFocus !== 'boolean') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (call && (call.caller === username || call.receiver === username)) {
      const recipient = call.caller === username ? call.receiver : call.caller;
      const recipientSocketId = onlineUsers.get(recipient);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('peer_focus_warning', {
          user: username,
          hasFocus
        });
      }
    }
  });

  // 8.5 Video State Sync (e.g. notify peer if camera is disabled/enabled)
  socket.on('video_state_changed', ({ sessionId, isVideoOff }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    if (typeof isVideoOff !== 'boolean') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (call && (call.caller === username || call.receiver === username)) {
      const recipient = call.caller === username ? call.receiver : call.caller;
      const recipientSocketId = onlineUsers.get(recipient);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('peer_video_changed', {
          user: username,
          isVideoOff
        });
      }
    }
  });

  // 8.6 Screenshot warning relay
  socket.on('screenshot_attempted', ({ sessionId }) => {
    if (!sessionId || typeof sessionId !== 'string') return;
    const username = socketToUser.get(socket.id);
    const call = activeCalls.get(sessionId);

    if (call && (call.caller === username || call.receiver === username)) {
      const recipient = call.caller === username ? call.receiver : call.caller;
      const recipientSocketId = onlineUsers.get(recipient);
      
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('peer_screenshot_warning', {
          user: username
        });
      }
    }
  });

  // 9. Admin Moderation Settings Config
  socket.on('admin_update_config', (newConfig) => {
    moderationConfig = { ...moderationConfig, ...newConfig };
    console.log('Admin updated moderation configuration:', moderationConfig);
    // Broadcast new config state to everyone for demo display
    io.emit('moderation_config_changed', moderationConfig);
  });

  socket.on('admin_get_config', (callback) => {
    callback(moderationConfig);
  });

  // Disconnection cleanup
  socket.on('disconnect', async () => {
    const username = socketToUser.get(socket.id);
    if (username) {
      console.log(`User disconnected: ${username}`);
      
      // Remove socket ID from user's active sessions Set
      const sessions = activeSessions.get(username);
      if (sessions) {
        sessions.delete(socket.id);
        
        // If no active connections remain for this username, start grace period
        if (sessions.size === 0) {
          activeSessions.delete(username);
          onlineUsers.delete(username);
          
          let hasActiveCall = false;
          for (const [sessionId, call] of activeCalls.entries()) {
            if (call.caller === username || call.receiver === username) {
              hasActiveCall = true;
              console.log(`[Reconnection] Starting 8s grace period for call session ${sessionId} after ${username} disconnected.`);
              
              const timeoutId = setTimeout(async () => {
                console.log(`[Reconnection] Grace period expired for ${username}. Terminating call session ${sessionId}.`);
                activeCallReconnectionTimeouts.delete(username);
                
                await updateUserPresence(username, 'offline');
                
                const targetState = [CallStates.CONNECTED, 'active', CallStates.RECONNECTING, CallStates.CONNECTING].includes(call.status)
                  ? CallStates.ENDED
                  : CallStates.FAILED;
                
                // Notify peer
                const peer = call.caller === username ? call.receiver : call.caller;
                const peerSocketId = onlineUsers.get(peer);
                if (peerSocketId) {
                  io.to(peerSocketId).emit('call_terminated', { sessionId });
                }
                await transitionCall(sessionId, targetState);
                broadcastUserList();
              }, 8000);
              
              activeCallReconnectionTimeouts.set(username, { timeoutId, sessionId });
            }
          }
          
          if (!hasActiveCall) {
            await updateUserPresence(username, 'offline');
            broadcastUserList();
          }
        } else {
          // If other tabs are still open, update onlineUsers to point to the last active tab
          if (onlineUsers.get(username) === socket.id) {
            onlineUsers.set(username, [...sessions].pop());
          }
        }
      } else {
        // Fallback for untracked connection
        onlineUsers.delete(username);
      }

      socketToUser.delete(socket.id);
      broadcastUserList();
    }
  });

  // Manual Presence Override
  socket.on('set_presence', async (status, callback) => {
    const username = socketToUser.get(socket.id);
    if (!username) {
      if (callback) callback({ success: false, error: 'Unauthenticated' });
      return;
    }
    if (!['online', 'away'].includes(status)) {
      if (callback) callback({ success: false, error: 'Invalid status' });
      return;
    }
    await updateUserPresence(username, status);
    console.log(`User ${username} manually set status to: ${status}`);
    if (callback) callback({ success: true });
    broadcastUserList();
  });
});

async function broadcastUserList() {
  try {
    // 1. Fetch current presence list from database
    const dbRes = await query(
      `SELECT name, username, online_status, bio, profile_image 
       FROM users 
       WHERE online_status IN ('online', 'away')`
    );

    // 2. Only include DB users who are ACTUALLY currently connected via socket (onlineUsers)
    const activeDbUsers = dbRes.rows.filter(row => onlineUsers.has(row.username));
    const activeDbUsernames = new Set(activeDbUsers.map(row => row.username));
    
    const fullList = activeDbUsers.map(row => ({
      username: row.username,
      name: row.name,
      online_status: row.online_status,
      bio: row.bio,
      profile_image: row.profile_image
    }));

    // Append any active socket connections in memory not in DB (e.g. anonymous nodes)
    for (const anonUsername of onlineUsers.keys()) {
      if (!activeDbUsernames.has(anonUsername)) {
        fullList.push({
          username: anonUsername,
          name: anonUsername,
          online_status: 'online',
          bio: 'Anonymous Node',
          profile_image: null
        });
      }
    }

    // Broadcast full profiles list (for Phase 2 features)
    io.emit('users_list_full', fullList);

    // Broadcast simple usernames list (for Phase 1 compatibility)
    const flatUsernames = fullList.map(u => u.username);
    io.emit('users_list', flatUsernames);

  } catch (err) {
    console.error('Error broadcasting user list:', err);
    // Fallback: emit flat usernames list from memory if database fails
    io.emit('users_list', Array.from(onlineUsers.keys()));
  }
}

httpServer.listen(PORT, '0.0.0.0', async () => {
  try {
    // Reset any stale presence records from past crashes/restarts
    await query("UPDATE users SET online_status = 'offline'");
  } catch (err) {
    console.warn('Could not reset DB user presence on startup:', err.message);
  }
  console.log(`Swaply Signaling Server running on port ${PORT} (listening on all interfaces, 0.0.0.0)`);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  
  const forceExitTimeout = setTimeout(() => {
    console.error('[Shutdown] Forced exit timeout triggered. Hard exit.');
    process.exit(1);
  }, 10000);

  httpServer.close(async () => {
    console.log('[Shutdown] HTTP server closed.');
    
    try {
      await pool.end();
      console.log('[Shutdown] Database connection pool closed.');
    } catch (err) {
      console.error('[Shutdown] Error closing database connection pool:', err);
    }
    
    clearTimeout(forceExitTimeout);
    console.log('[Shutdown] Graceful cleanup complete. Goodbye.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { io, httpServer };
