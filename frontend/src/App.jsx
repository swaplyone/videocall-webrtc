import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import OTPVerification from './components/OTPVerification';
import CallInterface from './components/CallInterface';
import NoticeModal from './components/NoticeModal';
import CustomPopup from './components/CustomPopup';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import FriendRequests from './pages/FriendRequests';
import CallHistory from './pages/CallHistory';
import Notifications from './pages/Notifications';
import VerifyPhone from './pages/VerifyPhone';
import PrivacyCenter from './pages/PrivacyCenter';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';

import { checkBrowserCompatibility } from './utils/browserSupport';
import { apiClient } from './utils/apiClient';
import { socketClient } from './utils/socketClient';

const socket = socketClient.initialize();

export default function App() {
  const navigate = useNavigate();
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
  const [isRestoredCall, setIsRestoredCall] = useState(false);

  // Moderation state
  const [moderationConfig, setModerationConfig] = useState({
    blockPhoneNumbers: true,
    blockEmails: true,
    blockSocials: true
  });

  // Notice dialog
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [pendingCallAction, setPendingCallAction] = useState(null);

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
        localStorage.setItem('swaply_current_user', username); // Persist
        
        const isAccepted = localStorage.getItem('swaply_notice_accepted');
        if (!isAccepted) {
          setIsNoticeOpen(true);
        }

        socketClient.getModerationConfig((config) => {
          setModerationConfig(config);
        });
        
        navigate('/dashboard');
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

      // Check if user needs verification
      if (data.email_verified === false) {
        // Renders OTPVerification overlay using tempToken
        setUserDetails({ ...data.user, email_verified: false });
        setAuthToken(data.tempToken);
        setCurrentUser(data.email);
        localStorage.setItem('swaply_auth_token', data.tempToken);
        localStorage.setItem('swaply_current_user', data.email);
        apiClient.setAuthToken(data.tempToken);
        return;
      }

      setAuthToken(data.accessToken);
      setUserDetails(data.user);
      setCurrentUser(data.user.username);
      setLoginError('');

      apiClient.setAuthToken(data.accessToken);

      localStorage.setItem('swaply_auth_token', data.accessToken);
      localStorage.setItem('swaply_user_details', JSON.stringify(data.user));
      localStorage.setItem('swaply_current_user', data.user.username);

      if (data.user.notice_accepted) {
        localStorage.setItem('swaply_notice_accepted', 'true');
        setIsNoticeOpen(false);
      } else {
        localStorage.removeItem('swaply_notice_accepted');
        setIsNoticeOpen(true);
      }

      socketClient.connect(data.accessToken);
      socketClient.register(data.user.username, (response) => {
        if (response.success) {
          socketClient.getModerationConfig((config) => {
            setModerationConfig(config);
          });
        }
      });

      navigate('/dashboard');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleSecureRegister = async ({ name, username, email, password }) => {
    try {
      await apiClient.register({ name, username, email, password });
      await handleSecureLogin({ identifier: username, password });
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('swaply_auth_token');
    localStorage.removeItem('swaply_user_details');
    localStorage.removeItem('swaply_current_user');
    localStorage.removeItem('swaply_notice_accepted');
    setAuthToken(null);
    setUserDetails(null);
    setCurrentUser('');
    apiClient.setAuthToken(null);
    socketClient.disconnect();
    resetCallState();
    navigate('/login');
  };

  // Socket Event Listeners Setup
  useEffect(() => {
    socket.on('users_list', (users) => {
      setUsersList(users);
    });

    socket.on('incoming_call', ({ from, sessionId }) => {
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
      console.log('[App] Call terminated by peer.');
    });

    socket.on('call_restored', ({ sessionId, remoteUser, isCaller }) => {
      console.log(`[App] Call session restored: ${sessionId}`);
      setActiveSessionId(sessionId);
      setRemoteUser(remoteUser);
      setIsCaller(isCaller);
      setIsRestoredCall(true);
      setCallState('active');
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
      socket.off('call_restored');
      socket.off('moderation_config_changed');
    };
  }, [callState, incomingCall]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('swaply_auth_token');
    const savedUser = localStorage.getItem('swaply_current_user');
    const savedDetailsStr = localStorage.getItem('swaply_user_details');

    if (savedUser) {
      if (savedToken) {
        apiClient.setAuthToken(savedToken);
        setAuthToken(savedToken);
        if (savedDetailsStr) {
          try {
            setUserDetails(JSON.parse(savedDetailsStr));
          } catch (e) {
            console.error('Error parsing saved user details:', e);
          }
        }
        setCurrentUser(savedUser);

        socketClient.connect(savedToken);
        socketClient.register(savedUser, (response) => {
          if (response.success) {
            socketClient.getModerationConfig((config) => {
              setModerationConfig(config);
            });
          } else {
            console.warn('Failed to restore secure socket session, clearing data:', response.error);
            handleLogout();
          }
        });
      } else {
        socketClient.connect();
        socketClient.register(savedUser, (response) => {
          if (response.success) {
            setCurrentUser(savedUser);
            socketClient.getModerationConfig((config) => {
              setModerationConfig(config);
            });
          } else {
            console.warn('Failed to restore anonymous socket session, clearing data:', response.error);
            handleLogout();
          }
        });
      }
    }
  }, []);

  const resetCallState = () => {
    setCallState('idle');
    setActiveSessionId(null);
    setRemoteUser(null);
    setIsCaller(false);
    setIncomingCall(null);
    setIsRestoredCall(false);
  };

  const checkNoticeAcknowledgment = (actionCallback) => {
    const isAccepted = localStorage.getItem('swaply_notice_accepted');
    if (isAccepted) {
      actionCallback();
    } else {
      setPendingCallAction(() => actionCallback);
      setIsNoticeOpen(true);
    }
  };

  const handleAcceptNotice = async () => {
    localStorage.setItem('swaply_notice_accepted', 'true');
    setIsNoticeOpen(false);

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
        } else {
          showPopup('Call Error', `Could not call: ${response.error}`, 'error');
          resetCallState();
        }
      });
    });
  };

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

  const handleRejectCall = (sessionId) => {
    socket.emit('reject_call', { sessionId });
    setIncomingCall(null);
  };

  const handleHangUp = () => {
    resetCallState();
  };

  const handleOTPVerified = (token, verifiedUser) => {
    setAuthToken(token);
    setUserDetails(verifiedUser);
    setCurrentUser(verifiedUser.username);
    
    apiClient.setAuthToken(token);

    localStorage.setItem('swaply_auth_token', token);
    localStorage.setItem('swaply_user_details', JSON.stringify(verifiedUser));
    localStorage.setItem('swaply_current_user', verifiedUser.username);
    
    socketClient.connect(token);
    socketClient.register(verifiedUser.username, (response) => {
      if (response.success) {
        socketClient.getModerationConfig((config) => {
          setModerationConfig(config);
        });
      }
    });

    navigate('/dashboard');
  };

  // If user details show unverified email, intercept with OTP verification overlay
  const isUnverified = userDetails && userDetails.email_verified === false;

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

      {isUnverified && (
        <OTPVerification
          email={currentUser}
          tempToken={authToken}
          purpose="FIRST_LOGIN"
          onVerified={handleOTPVerified}
          onCancel={handleLogout}
        />
      )}

      {/* Active Call Interface Overlay */}
      {callState === 'active' && (
        <CallInterface
          socket={socket}
          sessionId={activeSessionId}
          currentUser={currentUser}
          remoteUser={remoteUser}
          isCaller={isCaller}
          onHangUp={handleHangUp}
          authToken={authToken}
          isRestored={isRestoredCall}
        />
      )}

      {/* Main Routing Stage */}
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          currentUser ? <Navigate to="/dashboard" replace /> :
          <Login onLogin={handleLogin} onSecureLogin={handleSecureLogin} loginError={loginError} />
        } />
        <Route path="/register" element={
          currentUser ? <Navigate to="/dashboard" replace /> :
          <Register onSecureRegister={handleSecureRegister} loginError={loginError} />
        } />
        <Route path="/verify-phone" element={<VerifyPhone />} />

        {/* Protected Dashboard Routes */}
        <Route path="/*" element={
          !currentUser ? <Navigate to="/login" replace /> : (
            <div className="dashboard-layout">
              <Navbar currentUser={currentUser} userDetails={userDetails} onLogout={handleLogout} />
              <main className="main-stage">
                
                {/* Global Incoming Call notification bar */}
                {incomingCall && (
                  <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF3C7', padding: '1rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', marginBottom: '2rem' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>Incoming Call from @{incomingCall.from}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Beta peer is requesting a secure session.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', color: 'red' }} onClick={() => handleRejectCall(incomingCall.sessionId)}>Decline</button>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontWeight: 'bold' }} onClick={() => handleAcceptCall(incomingCall.sessionId)}>Accept Call</button>
                    </div>
                  </div>
                )}

                <Routes>
                  <Route path="/dashboard" element={<Dashboard currentUser={currentUser} userDetails={userDetails} onInitiateCall={handleInitiateCall} />} />
                  <Route path="/profile" element={<Profile userDetails={userDetails} onUpdateUserDetails={setUserDetails} />} />
                  <Route path="/friends" element={<Friends onInitiateCall={handleInitiateCall} />} />
                  <Route path="/friend-requests" element={<FriendRequests />} />
                  <Route path="/call-history" element={<CallHistory currentUser={currentUser} />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/privacy" element={<PrivacyCenter userDetails={userDetails} />} />
                  <Route path="/settings" element={<Settings userDetails={userDetails} onUpdateUserDetails={setUserDetails} />} />
                  <Route path="/admin" element={<AdminDashboard userDetails={userDetails} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </div>
  );
}
