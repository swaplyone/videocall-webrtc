import React, { useState, useEffect } from 'react';
import { Phone, Users, ShieldAlert, Activity, Clock, ChevronDown, ChevronUp, Video } from 'lucide-react';
import SwaplyLogo from './SwaplyLogo';
import CustomPopup from './CustomPopup';
import SwipeRequests from './SwipeRequests';
import { checkBrowserCompatibility } from '../utils/browserSupport';
import SafetyCenter from './SafetyCenter';
import { apiClient } from '../utils/apiClient';
import { socketClient } from '../utils/socketClient';

const getBackendUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:5000`;
    }
  }
  return 'https://videocall-webrtc-uiwb.onrender.com';
};

const BACKEND_URL = getBackendUrl();

export default function Dashboard({
  currentUser,
  authToken,
  usersList,
  incomingCall,
  onLogin,
  onSecureLogin,
  onSecureRegister,
  onInitiateCall,
  onAcceptCall,
  onRejectCall,
  moderationConfig,
  onUpdateModerationConfig,
  loginError
}) {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register'
  const [usernameInput, setUsernameInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [identifierInput, setIdentifierInput] = useState('');
  const [targetUser, setTargetUser] = useState('');

  // Active View & Collapsible States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Custom Popup state
  const [popupState, setPopupState] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const showPopup = (title, message, type = 'info') => {
    setPopupState({ isOpen: true, title, message, type });
  };



  // Call History states
  const [callHistory, setCallHistory] = useState([]);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All');
  const [historyQualityFilter, setHistoryQualityFilter] = useState('All');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [compatReport, setCompatReport] = useState(null);

  // Friends Dashboard states
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add-friend'
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [qrToken, setQrToken] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [qrActive, setQrActive] = useState(true);
  const [privacySettings, setPrivacySettings] = useState({
    searchable: true,
    allow_requests: true,
    show_beta_id: true,
    qr_active: true
  });

  const [userBetaId, setUserBetaId] = useState(userDetails?.beta_id || '');

  useEffect(() => {
    setCompatReport(checkBrowserCompatibility());
    if (!userBetaId) {
      apiClient.getMe().then(data => {
        if (data && data.user && data.user.beta_id) {
          setUserBetaId(data.user.beta_id);
        }
      }).catch(() => {});
    }
  }, [userBetaId]);

  const fetchFriends = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  const fetchRequests = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/requests`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setIncomingRequests(data.incoming || []);
        setOutgoingRequests(data.outgoing || []);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const fetchOwnQr = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/qr`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setQrToken(data.qr_token || '');
        setInviteUrl(data.inviteUrl || '');
        setQrActive(data.qr_active !== false);
      }
    } catch (err) {
      console.error('Error fetching QR:', err);
    }
  };

  const fetchPrivacySettings = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success && data.user) {
        setPrivacySettings({
          searchable: data.user.searchable !== false,
          allow_requests: data.user.allow_requests !== false,
          show_beta_id: data.user.show_beta_id !== false,
          qr_active: data.user.qr_active !== false
        });
      }
    } catch (err) {
      console.error('Error fetching privacy settings:', err);
    }
  };

  const handlePrivacyToggle = async (key, checked) => {
    const updated = { ...privacySettings, [key]: checked };
    setPrivacySettings(updated);

    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ [key]: checked })
      });
      const data = await res.json();
      if (!data.success) {
        showPopup('Error', 'Failed to update privacy settings', 'error');
        setPrivacySettings(privacySettings);
      } else {
        showPopup('Success', 'Privacy settings updated successfully.', 'success');
        if (key === 'qr_active') {
          fetchOwnQr();
        }
      }
    } catch (err) {
      console.error('Error saving privacy toggle:', err);
      showPopup('Error', 'Failed to save privacy settings', 'error');
      setPrivacySettings(privacySettings);
    }
  };

  const handleSearch = async (queryStr) => {
    setSearchQuery(queryStr);
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/search?q=${encodeURIComponent(queryStr)}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSendRequest = async (targetUsername) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ target: targetUsername })
      });
      const data = await res.json();
      if (data.success) {
        showPopup('Request Sent', `Friend request sent to @${targetUsername}!`, 'success');
        fetchRequests();
      } else {
        showPopup('Request Failed', data.error || 'Failed to send request', 'error');
      }
    } catch (err) {
      console.error('Error sending request:', err);
    }
  };

  const handleAcceptRequest = async (reqId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/request/${reqId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showPopup('Connected', 'Friend request accepted!', 'success');
        fetchFriends();
        fetchRequests();
      }
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleRejectRequest = async (reqId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/friends/request/${reqId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showPopup('Rejected', 'Friend request passed.', 'info');
        fetchRequests();
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const fetchCallHistory = async () => {
    if (!currentUser || !authToken) return;
    setHistoryLoading(true);
    try {
      const data = await apiClient.getCallHistory(historyTypeFilter, historyQualityFilter);
      setCallHistory(data.calls || []);
      setHistoryError('');
    } catch (err) {
      console.error('Error fetching call history:', err);
      setHistoryError(err.message || 'Error fetching call history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && authToken) {
      fetchCallHistory();
      fetchFriends();
      fetchRequests();
      fetchOwnQr();
      fetchPrivacySettings();
    }
  }, [currentUser, authToken, historyTypeFilter, historyQualityFilter]);

  useEffect(() => {
    if (!authToken) return;
    const socket = socketClient.getSocket();
    if (!socket) return;

    const handleReqRecv = () => fetchRequests();
    const handleReqAcc = () => {
      fetchFriends();
      fetchRequests();
    };
    const handleReqRej = () => fetchRequests();
    const handleRem = () => fetchFriends();

    socket.on('friend_request_received', handleReqRecv);
    socket.on('friend_request_accepted', handleReqAcc);
    socket.on('friend_request_rejected', handleReqRej);
    socket.on('friend_removed', handleRem);

    return () => {
      socket.off('friend_request_received', handleReqRecv);
      socket.off('friend_request_accepted', handleReqAcc);
      socket.off('friend_request_rejected', handleReqRej);
      socket.off('friend_removed', handleRem);
    };
  }, [authToken]);



  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      onLogin(usernameInput.trim());
    }
  };

  const handleSecureLoginSubmit = (e) => {
    e.preventDefault();
    if (identifierInput.trim() && passwordInput) {
      onSecureLogin({
        identifier: identifierInput.trim(),
        password: passwordInput
      });
    }
  };

  const handleSecureRegisterSubmit = (e) => {
    e.preventDefault();
    if (nameInput.trim() && usernameInput.trim() && emailInput.trim() && passwordInput) {
      onSecureRegister({
        name: nameInput.trim(),
        username: usernameInput.trim(),
        email: emailInput.trim(),
        password: passwordInput
      });
    }
  };

  const handleDialSubmit = (e) => {
    e.preventDefault();
    if (targetUser.trim() && targetUser !== currentUser) {
      onInitiateCall(targetUser.trim());
    }
  };

  // If not logged in, show login panel
  if (!currentUser) {
    return (
      <div className="glass-panel auth-panel">
        <h2 className="auth-title">Swaply Authentication</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} />
        </div>

        {/* Tab Selection */}
        <div className="auth-tabs-container">
          <button 
            type="button"
            className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`} 
            onClick={() => { setAuthMode('login'); setPasswordInput(''); }}
          >
            Login
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`} 
            onClick={() => { setAuthMode('register'); setUsernameInput(''); setPasswordInput(''); }}
          >
            Register
          </button>
        </div>

        {/* Secure Login Form */}
        {authMode === 'login' && (
          <form onSubmit={handleSecureLoginSubmit}>
            <div className="input-group">
              <label htmlFor="identifier">Username or Email</label>
              <input
                id="identifier"
                type="text"
                placeholder="Enter username or email"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                {loginError}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Authenticate Profile
            </button>
          </form>
        )}

        {/* Secure Register Form */}
        {authMode === 'register' && (
          <form onSubmit={handleSecureRegisterSubmit}>
            <div className="input-group">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                placeholder="John Doe"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                placeholder="johndoe"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                placeholder="john@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                placeholder="•••••••• (min 6 chars)"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                {loginError}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Create Secure Profile
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '1360px', margin: '0 auto', padding: '1rem' }}>
      {/* Incoming Call Overlay */}
      {incomingCall && (
        <div className="incoming-call-box">
          <div className="avatar-glow">
            {incomingCall.from.substring(0, 2).toUpperCase()}
          </div>
          <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Incoming Dial Offer
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
            Node <strong>{incomingCall.from}</strong> requests calling connection...
          </p>
          <div className="incoming-buttons">
            <button
              className="btn btn-primary"
              onClick={() => onAcceptCall(incomingCall.sessionId)}
            >
              Accept Link
            </button>
            <button
              className="btn btn-danger"
              onClick={() => onRejectCall(incomingCall.sessionId)}
            >
              Reject Link
            </button>
          </div>
        </div>
      )}

      {/* Main Dashboard Stage */}
      {!incomingCall && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Header Console & Quick Dial Bar */}
          <div className="glass-panel" style={{ padding: '1.4rem 1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="node-avatar-circle" style={{ width: '44px', height: '44px', fontSize: '1rem' }}>
                  {currentUser.substring(0, 2).toUpperCase()}
                  <span className="node-status-dot"></span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: '800', fontSize: '1.1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{currentUser}</span>
                    <span className="user-dot"></span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>ACTIVE NODE</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                    Beta ID: <strong style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{userDetails?.beta_id || userBetaId || 'SWP-BETA'}</strong> &nbsp;|&nbsp; PROTOCOL: P2P WebRTC
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Dial Input Bar */}
            <form onSubmit={handleDialSubmit} className="quick-dial-form" style={{ marginTop: 0 }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  id="target-user"
                  type="text"
                  placeholder={compatReport?.status === 'Unsupported' ? 'Calling disabled: WebRTC not supported by browser.' : 'Enter node username to initiate direct call (e.g. Alice, Bob)...'}
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  disabled={compatReport?.status === 'Unsupported'}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!targetUser.trim() || targetUser.trim() === currentUser || compatReport?.status === 'Unsupported'}
              >
                <Phone size={16} />
                Initiate Call
              </button>
            </form>
          </div>

          {/* Browser Diagnostics Bento Card */}
          {compatReport && (
            <div className="directory-panel" style={{ marginTop: 0 }}>
              <div className="directory-tab" style={{ background: 'var(--color-info)' }}>DIAGNOSTICS.idx</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.2rem' }}>
                  <Activity size={20} style={{ color: 'var(--color-info)' }} />
                  Browser Diagnostics
                </h2>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  border: '1.5px solid var(--border-color)',
                  background: compatReport.status === 'Excellent' ? 'rgba(74, 110, 83, 0.15)' : compatReport.status === 'Good' ? 'rgba(229, 169, 60, 0.15)' : compatReport.status === 'Warning' ? 'rgba(212, 91, 62, 0.15)' : 'rgba(190, 77, 77, 0.15)',
                  color: compatReport.status === 'Excellent' ? 'var(--color-secondary)' : compatReport.status === 'Good' ? 'var(--color-accent)' : compatReport.status === 'Warning' ? 'var(--color-primary)' : 'var(--color-danger)',
                  textTransform: 'uppercase'
                }}>
                  {compatReport.status} Compatibility
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  ENVIRONMENT: <strong style={{ color: 'var(--text-primary)' }}>{compatReport.browser.name} (v{compatReport.browser.version})</strong>
                </div>

                {/* Feature Checklist Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.75rem',
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px dashed var(--border-color)'
                }}>
                  {[
                    { name: 'WebRTC Connection', supported: compatReport.features.webRTC },
                    { name: 'Media Capture (Webcam/Mic)', supported: compatReport.features.getUserMedia },
                    { name: 'Device Enumeration', supported: compatReport.features.enumerateDevices },
                    { name: 'Telemetry (getStats)', supported: compatReport.features.getStats },
                    { name: 'Track Swapping (replaceTrack)', supported: compatReport.features.replaceTrack },
                    { name: 'Bitrate Scale (setParameters)', supported: compatReport.features.setParameters },
                    { name: 'Picture-in-Picture Mode', supported: compatReport.features.pictureInPicture },
                    { name: 'Fullscreen API', supported: compatReport.features.fullscreen }
                  ].map((f) => (
                    <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ color: f.supported ? 'var(--color-secondary)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                        {f.supported ? '✓' : '✗'}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{f.name}</span>
                    </div>
                  ))}
                </div>

                {/* Diagnostic Warning Notes */}
                {compatReport.notes.length > 0 && (
                  <div style={{
                    background: compatReport.status === 'Unsupported' ? 'rgba(190, 77, 77, 0.08)' : 'rgba(229, 169, 60, 0.08)',
                    borderLeft: `4px solid ${compatReport.status === 'Unsupported' ? 'var(--color-danger)' : 'var(--color-accent)'}`,
                    padding: '0.8rem 1.2rem',
                    borderRadius: '4px'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      color: compatReport.status === 'Unsupported' ? 'var(--color-danger)' : 'var(--color-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.4rem'
                    }}>
                      <ShieldAlert size={14} />
                      Recommendations & Notices:
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                      {compatReport.notes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Online Node Profile Cards Grid */}
          <div className="directory-panel">
            <div className="directory-tab">FRIENDS_NETWORK.idx</div>
            
            {/* Tabs Selector */}
            <div className="friends-tabs">
              <button 
                type="button"
                className={`friends-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                My Friends ({friends.length})
              </button>
              <button 
                type="button"
                className={`friends-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                Invites ({incomingRequests.length})
              </button>
              <button 
                type="button"
                className={`friends-tab-btn ${activeTab === 'add-friend' ? 'active' : ''}`}
                onClick={() => setActiveTab('add-friend')}
              >
                Add Friend
              </button>
              <button 
                type="button"
                className={`friends-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
                onClick={() => setActiveTab('privacy')}
              >
                Privacy
              </button>
              <button 
                type="button"
                className={`friends-tab-btn ${activeTab === 'safety-center' ? 'active' : ''}`}
                onClick={() => setActiveTab('safety-center')}
              >
                Safety Center
              </button>
            </div>

            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="friends-tab-content">
                {friends.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                    No friends accepted yet. Go to "Add Friend" to send a connection request!
                  </div>
                ) : (
                  <div className="active-users-grid">
                    {friends.map((friend) => {
                      const isOnline = usersList.some(u => (typeof u === 'string' ? u : u.username) === friend.username);
                      return (
                        <div key={friend.username} className="active-user-card">
                          <div className="card-header-badge">
                            <div className="node-avatar-circle">
                              {friend.username.substring(0, 2).toUpperCase()}
                              <span className={`node-status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                            </div>
                            <div className="card-node-info">
                              <span className="node-display-name">{friend.name || friend.username}</span>
                              <span className="node-username-tag">@{friend.username}</span>
                              <div className="node-meta-pills">
                                <span className="node-pill">{friend.beta_id || 'SWP-BETA'}</span>
                                <span className={`node-pill ${isOnline ? 'online-pill' : 'offline-pill'}`}>
                                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
                              onClick={() => onInitiateCall(friend.username)}
                              disabled={compatReport?.status === 'Unsupported' || !isOnline}
                              title={!isOnline ? 'User is offline' : 'Call friend'}
                            >
                              <Phone size={16} />
                              Call Friend
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="friends-tab-content">
                <SwipeRequests 
                  requests={incomingRequests}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              </div>
            )}

            {/* Add Friend Tab */}
            {activeTab === 'add-friend' && (
              <div className="friends-tab-content add-friend-view">
                {/* Search Box */}
                <div className="search-section">
                  <label htmlFor="friend-search">Search by Username or Beta ID</label>
                  <input
                    id="friend-search"
                    type="text"
                    placeholder="Enter @username or SWP-XXXXX..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                  
                  {searchResults.length > 0 && (
                    <div className="search-results-list">
                      {searchResults.map((user) => (
                        <div key={user.username} className="search-result-item">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="search-result-avatar">
                              {user.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div className="search-result-name">{user.name || user.username}</div>
                              <div className="search-result-meta">@{user.username} • {user.beta_id}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                            onClick={() => handleSendRequest(user.username)}
                          >
                            Add Friend
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <div className="search-no-results">No users found matching your query.</div>
                  )}
                </div>

                {/* QR Invitation Code Section */}
                <div className="qr-invite-section">
                  <h4>My Invitation Code</h4>
                  <div className="qr-box">
                    <div className="mock-qr-code">
                      <div className="qr-pixel-grid">
                        {[...Array(64)].map((_, i) => (
                          <div key={i} className={`qr-pixel ${(i % 3 === 0 || i % 7 === 0) ? 'active' : ''}`}></div>
                        ))}
                      </div>
                    </div>
                    <div className="qr-details">
                      <span className="qr-invite-url">{inviteUrl || 'swaply://friend/...'}</span>
                      <p className="qr-hint">Let another beta tester scan this layout to establish request links!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Settings Tab */}
            {activeTab === 'privacy' && (
              <div className="friends-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.1rem', fontWeight: 800 }}>
                  Beta Privacy Controls
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#111827', padding: '1.5rem', borderRadius: '8px', border: '2px solid var(--border-color)' }}>
                  
                  {/* Searchable toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left', paddingRight: '1rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.9rem' }}>Searchable Profile</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allow other beta testers to search your profile by name/username</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={privacySettings.searchable} 
                      onChange={(e) => handlePrivacyToggle('searchable', e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Allow Requests toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                    <div style={{ textAlign: 'left', paddingRight: '1rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.9rem' }}>Allow Friend Requests</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allow other testers to send connection invitations to your account</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={privacySettings.allow_requests} 
                      onChange={(e) => handlePrivacyToggle('allow_requests', e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* Show Beta ID toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                    <div style={{ textAlign: 'left', paddingRight: '1rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.9rem' }}>Display Beta ID</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show your SWP-XXXXX Beta ID on cards and friend screens</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={privacySettings.show_beta_id} 
                      onChange={(e) => handlePrivacyToggle('show_beta_id', e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* QR Active toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                    <div style={{ textAlign: 'left', paddingRight: '1rem' }}>
                      <div style={{ fontWeight: 'bold', color: '#FFF', fontSize: '0.9rem' }}>Enable QR Invitation Code</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Allow invitations via personal QR link scan resolution</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={privacySettings.qr_active} 
                      onChange={(e) => handlePrivacyToggle('qr_active', e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                    />
                  </div>

                </div>
              </div>
            )}
            {/* Safety Center Tab */}
            {activeTab === 'safety-center' && (
              <div className="friends-tab-content" style={{ padding: 0 }}>
                <SafetyCenter authToken={authToken} />
              </div>
            )}
          </div>

          {/* Collapsible Connection Telemetry Logs */}
          <div style={{ width: '100%' }}>
            <button 
              type="button"
              className="collapsible-toggle-btn"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Clock size={18} />
                Full Call Connection Telemetry Logs ({callHistory.length})
              </span>
              {isHistoryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {isHistoryOpen && (
              <div className="directory-panel" style={{ marginTop: '3rem', borderRadius: '0 8px 8px 8px' }}>
                <div className="directory-tab">HISTORY.idx</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, fontSize: '1.1rem' }}>
                    <Clock size={18} />
                    Connection Telemetry Logs
                  </h2>

                  {/* Query Filters */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <select
                      value={historyTypeFilter}
                      onChange={(e) => setHistoryTypeFilter(e.target.value)}
                      style={{ width: 'auto', padding: '0.35rem 1.8rem 0.35rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      <option value="All">All Types</option>
                      <option value="Incoming">Incoming</option>
                      <option value="Outgoing">Outgoing</option>
                      <option value="Missed">Missed</option>
                      <option value="Rejected">Rejected</option>
                    </select>

                    <select
                      value={historyQualityFilter}
                      onChange={(e) => setHistoryQualityFilter(e.target.value)}
                      style={{ width: 'auto', padding: '0.35rem 1.8rem 0.35rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      <option value="All">All Qualities</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {!authToken ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>
                    Authentication required to view telemetry history.
                  </div>
                ) : historyError ? (
                  <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                    {historyError}
                  </div>
                ) : historyLoading ? (
                  <div className="empty-state">Loading telemetry logs...</div>
                ) : callHistory.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2rem' }}>No matching call logs in history index.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-retro">
                      <thead>
                        <tr>
                          <th>PARTNER NODE</th>
                          <th>DIRECTION</th>
                          <th>STATUS</th>
                          <th>DURATION</th>
                          <th>START TIME</th>
                          <th style={{ textAlign: 'right' }}>QUALITY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {callHistory.map((call) => {
                          const qualityColors = {
                            'Excellent': { bg: 'rgba(74, 110, 83, 0.15)', text: 'var(--color-secondary)' },
                            'Good': { bg: 'rgba(74, 110, 83, 0.15)', text: 'var(--color-secondary)' },
                            'Fair': { bg: 'rgba(229, 169, 60, 0.15)', text: 'var(--color-accent)' },
                            'Poor': { bg: 'rgba(212, 91, 62, 0.15)', text: 'var(--color-primary)' },
                            'Critical': { bg: 'rgba(190, 77, 77, 0.15)', text: 'var(--color-danger)' },
                            'Unrated': { bg: 'rgba(107, 101, 92, 0.15)', text: 'var(--text-secondary)' }
                          };
                          const statusColors = {
                            'completed': { bg: 'rgba(74, 110, 83, 0.15)', text: 'var(--color-secondary)', border: 'var(--color-secondary)' },
                            'rejected': { bg: 'rgba(190, 77, 77, 0.15)', text: 'var(--color-danger)', border: 'var(--color-danger)' },
                            'missed': { bg: 'rgba(212, 91, 62, 0.15)', text: 'var(--color-primary)', border: 'var(--color-primary)' },
                            'active': { bg: 'rgba(76, 119, 159, 0.15)', text: 'var(--color-info)', border: 'var(--color-info)' },
                            'ringing': { bg: 'rgba(229, 169, 60, 0.15)', text: 'var(--color-accent)', border: 'var(--color-accent)' }
                          };

                          const badge = qualityColors[call.quality_tag] || qualityColors['Unrated'];
                          const statusStyle = statusColors[(call.status || '').toLowerCase()] || { bg: 'rgba(107, 101, 92, 0.15)', text: 'var(--text-secondary)', border: 'var(--text-secondary)' };

                          const formatDuration = (secs) => {
                            if (!secs) return '0s';
                            if (secs < 60) return `${secs}s`;
                            const mins = Math.floor(secs / 60);
                            const remainingSecs = secs % 60;
                            return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
                          };

                          return (
                            <tr key={call.id}>
                              <td style={{ fontWeight: 700 }}>
                                {call.partner_name} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '0.75rem' }}>({call.partner_username})</span>
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  border: '1px solid currentColor',
                                  background: call.is_caller ? 'rgba(76, 119, 159, 0.15)' : 'rgba(229, 169, 60, 0.15)',
                                  color: call.is_caller ? 'var(--color-info)' : 'var(--color-accent)',
                                  fontWeight: 'bold'
                                }}>
                                  {call.is_caller ? 'OUTGOING' : 'INCOMING'}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  border: `1px solid ${statusStyle.border}`,
                                  background: statusStyle.bg,
                                  color: statusStyle.text,
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase'
                                }}>
                                  {call.status}
                                </span>
                              </td>
                              <td style={{ fontWeight: '500' }}>
                                {formatDuration(call.duration)}
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {new Date(call.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  background: badge.bg,
                                  color: badge.text,
                                  border: '1px solid currentColor'
                                }}>
                                  {call.quality_tag}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      <CustomPopup
        isOpen={popupState.isOpen}
        title={popupState.title}
        message={popupState.message}
        type={popupState.type}
        onClose={() => setPopupState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
