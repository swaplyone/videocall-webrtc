import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import SwaplyLogo from './components/SwaplyLogo';
import Dashboard from './components/Dashboard';
import CallInterface from './components/CallInterface';
import NoticeModal from './components/NoticeModal';
import CustomPopup from './components/CustomPopup';
import { checkBrowserCompatibility } from './utils/browserSupport';
import { apiClient } from './utils/apiClient';
import { socketClient } from './utils/socketClient';

const socket = socketClient.initialize();

export default function App() {
  const [currentUser, setCurrentUser] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loginError, setLoginError] = useState('');

  // Call management state
  const [callState, setCallState] = useState('idle'); // idle, active
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [isCaller, setIsCaller] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);

  // Moderation state
  const [moderationConfig, setModerationConfig] = useState({
    blockPhoneNumbers: true,
    blockEmails: true,
    blockSocials: true
  });

  // Notice dialog
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [pendingCallAction, setPendingCallAction] = useState(null); // callback to run after accepting notice

  // Custom Popup state
  const [popupState, setPopupState] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const showPopup = (title, message, type = 'info') => {
    setPopupState({ isOpen: true, title, message, type });
  };

  // Connect socket when user logs in (Anonymous Mode)
  const handleLogin = (username) => {
    socketClient.connect();
    socketClient.register(username, (response) => {
      if (response.success) {
        setCurrentUser(username);
        setLoginError('');
        
        // Show safety warning notice if not accepted in local storage
        const isAccepted = localStorage.getItem('swaply_notice_accepted');
        if (!isAccepted) {
          setIsNoticeOpen(true);
        }

        // Fetch current moderation config from server
        socketClient.getModerationConfig((config) => {
          setModerationConfig(config);
        });
      } else {
        setLoginError(response.error);
        socketClient.disconnect();
      }
    });
  };

  // Secure Auth Login (REST + Socket connect)
  const handleSecureLogin = async ({ identifier, password }) => {
    try {
      const data = await apiClient.login(identifier, password);

      setAuthToken(data.accessToken);
      setUserDetails(data.user);
      setCurrentUser(data.user.username);
      setLoginError('');

      // Synchronize safety notice dialog acceptance
      if (data.user.notice_accepted) {
        localStorage.setItem('swaply_notice_accepted', 'true');
        setIsNoticeOpen(false);
      } else {
        localStorage.removeItem('swaply_notice_accepted');
        setIsNoticeOpen(true);
      }

      // Establish authenticated socket presence
      socketClient.connect(data.accessToken);
      socketClient.register(data.user.username, (response) => {
        if (response.success) {
          socketClient.getModerationConfig((config) => {
            setModerationConfig(config);
          });
        } else {
          setLoginError(response.error);
          socketClient.disconnect();
        }
      });
    } catch (err) {
      setLoginError(err.message);
    }
  };

  // Secure Auth Register (REST + Auto Login)
  const handleSecureRegister = async ({ name, username, email, password }) => {
    try {
      await apiClient.register({ name, username, email, password });

      // Auto login on successful register
      await handleSecureLogin({ identifier: username, password });
    } catch (err) {
      setLoginError(err.message);
    }
  };

  // 1. Socket Event Listeners Setup
  useEffect(() => {
    socket.on('users_list', (users) => {
      setUsersList(users);
    });

    socket.on('incoming_call', ({ from, sessionId }) => {
      // If user is already in a call, reject automatically
      if (callState !== 'idle' || incomingCall) {
        socket.emit('reject_call', { sessionId });
        return;
      }
      setIncomingCall({ from, sessionId });
    });

    socket.on('call_accepted', ({ sessionId }) => {
      setActiveSessionId(sessionId);
      setCallState('active');
      setIncomingCall(null);
    });

    socket.on('call_rejected', () => {
      showPopup('Call Rejected', 'The call was rejected by the recipient.', 'warning');
      resetCallState();
    });

    socket.on('call_terminated', () => {
      // Let CallInterface handle state transition and show feedback
      console.log('[App] Call terminated by peer.');
    });

    socket.on('moderation_config_changed', (newConfig) => {
      setModerationConfig(newConfig);
    });

    return () => {
      socket.off('users_list');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_terminated');
      socket.off('moderation_config_changed');
    };
  }, [callState, incomingCall]);

  const resetCallState = () => {
    setCallState('idle');
    setActiveSessionId(null);
    setRemoteUser(null);
    setIsCaller(false);
    setIncomingCall(null);
  };

  // Check if safety warning needs acknowledgment
  const checkNoticeAcknowledgment = (actionCallback) => {
    const isAccepted = localStorage.getItem('swaply_notice_accepted');
    if (isAccepted) {
      actionCallback();
    } else {
      setPendingCallAction(() => actionCallback);
      setIsNoticeOpen(true);
    }
  };

  // Accept notice callback
  const handleAcceptNotice = async () => {
    localStorage.setItem('swaply_notice_accepted', 'true');
    setIsNoticeOpen(false);

    // Persist notice status in database if authenticated via JWT
    if (authToken) {
      try {
        await apiClient.acceptNotice();
        setUserDetails(prev => prev ? { ...prev, notice_accepted: true } : null);
      } catch (err) {
        console.warn('Could not persist safety notice state to database:', err);
      }
    }

    if (pendingCallAction) {
      pendingCallAction();
      setPendingCallAction(null);
    }
  };

  // Initiate call action
  const handleInitiateCall = (targetUser) => {
    const compat = checkBrowserCompatibility();
    if (compat.status === 'Unsupported') {
      showPopup('Browser Unsupported', 'Call initiation blocked: Your browser does not support core WebRTC or media capture features.', 'error');
      return;
    }
    checkNoticeAcknowledgment(() => {
      setRemoteUser(targetUser);
      setIsCaller(true);
      socket.emit('initiate_call', { to: targetUser }, (response) => {
        if (response.success) {
          setActiveSessionId(response.sessionId);
          // Wait for receiver to accept
        } else {
          showPopup('Call Error', `Could not call: ${response.error}`, 'error');
          resetCallState();
        }
      });
    });
  };

  // Accept incoming call action
  const handleAcceptCall = (sessionId) => {
    const compat = checkBrowserCompatibility();
    if (compat.status === 'Unsupported') {
      showPopup('Browser Unsupported', 'Call acceptance blocked: Your browser does not support core WebRTC or media capture features.', 'error');
      return;
    }
    checkNoticeAcknowledgment(() => {
      setRemoteUser(incomingCall.from);
      setIsCaller(false);
      socket.emit('accept_call', { sessionId }, (response) => {
        if (response.success) {
          setActiveSessionId(sessionId);
          setCallState('active');
          setIncomingCall(null);
        } else {
          showPopup('Call Error', `Failed to accept call: ${response.error}`, 'error');
          resetCallState();
        }
      });
    });
  };

  // Reject incoming call action
  const handleRejectCall = (sessionId) => {
    socket.emit('reject_call', { sessionId });
    setIncomingCall(null);
  };

  // Terminate active call action
  const handleHangUp = () => {
    resetCallState();
  };

  // Admin config update action
  const handleUpdateModerationConfig = (updatedFields) => {
    const newConfig = { ...moderationConfig, ...updatedFields };
    socket.emit('admin_update_config', newConfig);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Disclaimer Acknowledgment Modal */}
      <NoticeModal isOpen={isNoticeOpen} onAccept={handleAcceptNotice} />

      <CustomPopup
        isOpen={popupState.isOpen}
        title={popupState.title}
        message={popupState.message}
        type={popupState.type}
        onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
      />

      {callState === 'active' ? (
        <CallInterface
          socket={socket}
          sessionId={activeSessionId}
          currentUser={currentUser}
          remoteUser={remoteUser}
          isCaller={isCaller}
          onHangUp={handleHangUp}
          authToken={authToken}
        />
      ) : (
        <>
          {/* Header */}
          <header className="app-header">
            <h1 className="logo">
              <SwaplyLogo size={52} />
              Swaply
            </h1>
            {currentUser && (
              <div className="user-badge">
                <span className="user-dot"></span>
                <span>{currentUser}</span>
              </div>
            )}
          </header>

          {/* Dashboard */}
          <Dashboard
            currentUser={currentUser}
            authToken={authToken}
            usersList={usersList}
            incomingCall={incomingCall}
            onLogin={handleLogin}
            onSecureLogin={handleSecureLogin}
            onSecureRegister={handleSecureRegister}
            onInitiateCall={handleInitiateCall}
            onAcceptCall={handleAcceptCall}
            onRejectCall={handleRejectCall}
            moderationConfig={moderationConfig}
            onUpdateModerationConfig={handleUpdateModerationConfig}
            loginError={loginError}
          />
        </>
      )}
    </div>
  );
}
