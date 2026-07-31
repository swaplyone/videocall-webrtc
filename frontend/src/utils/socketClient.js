import io from 'socket.io-client';

const BACKEND_URL = 
  (typeof process !== 'undefined' && process.env && process.env.VITE_BACKEND_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  (typeof window !== 'undefined' && window.location ? (window.location.protocol + '//' + window.location.hostname + ':5000') : 'http://localhost:5000');

let socket = null;

export const socketClient = {
  /**
   * Retrieves the raw underlying Socket.io reference.
   */
  getSocket() {
    return socket;
  },

  /**
   * Instantiates the socket connections.
   * @param {string|null} token JWT token for authenticated sockets.
   */
  initialize(token = null) {
    if (socket) {
      socket.disconnect();
    }
    socket = io(BACKEND_URL, {
      autoConnect: false,
      auth: token ? { token } : {}
    });
    return socket;
  },

  /**
   * Connects the socket to the signaling server.
   */
  connect(token = null) {
    if (!socket) {
      this.initialize(token);
    } else if (token) {
      socket.auth = { token };
    }
    socket.connect();
  },

  /**
   * Disconnects the socket.
   */
  disconnect() {
    if (socket) {
      socket.disconnect();
    }
  },

  /**
   * Register username mapping.
   */
  register(username, callback) {
    if (!socket) return;
    socket.emit('register', username, callback);
  },

  /**
   * Request calling peer.
   */
  requestCall(targetUsername, mode, callback) {
    if (!socket) return;
    socket.emit('request_call', { targetUsername, mode }, callback);
  },

  acceptCall(sessionId) {
    if (!socket) return;
    socket.emit('accept_call', { sessionId });
  },

  rejectCall(sessionId) {
    if (!socket) return;
    socket.emit('reject_call', { sessionId });
  },

  cancelCall(sessionId) {
    if (!socket) return;
    socket.emit('cancel_call', { sessionId });
  },

  sendSignal(sessionId, signalData) {
    if (!socket) return;
    socket.emit('signal', { sessionId, ...signalData });
  },

  sendVideoState(sessionId, isVideoOff) {
    if (!socket) return;
    socket.emit('video_state_changed', { sessionId, isVideoOff });
  },

  sendChatMessage(sessionId, text) {
    if (!socket) return;
    socket.emit('send_message', { sessionId, text });
  },

  updatePresence(status) {
    if (!socket) return;
    socket.emit('presence_status', { status });
  },

  updateModerationConfig(config) {
    if (!socket) return;
    socket.emit('admin_update_config', config);
  },

  getModerationConfig(callback) {
    if (!socket) return;
    socket.emit('admin_get_config', callback);
  },

  /**
   * Register event listener.
   */
  on(event, handler) {
    if (!socket) return;
    socket.on(event, handler);
  },

  /**
   * Remove event listener.
   */
  off(event, handler) {
    if (!socket) return;
    if (handler) {
      socket.off(event, handler);
    } else {
      socket.off(event);
    }
  }
};
export default socketClient;
