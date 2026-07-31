import React, { useState, useEffect } from 'react';
import { Phone, Users, Shield, Settings, Info, UserCheck, ShieldAlert, Activity, Clock, ChevronDown, ChevronUp, Video } from 'lucide-react';
import SwaplyLogo from './SwaplyLogo';
import CustomPopup from './CustomPopup';
import { checkBrowserCompatibility } from '../utils/browserSupport';
import { apiClient } from '../utils/apiClient';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.protocol + '//' + window.location.hostname + ':5000');

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

  // Admin moderation states
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [adminStats, setAdminStats] = useState({ totalUsers: 0, onlineUsers: 0, totalCalls: 0, flaggedMessages: 0 });
  const [adminReports, setAdminReports] = useState([]);
  const [adminError, setAdminError] = useState('');

  // Call History states
  const [callHistory, setCallHistory] = useState([]);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('All');
  const [historyQualityFilter, setHistoryQualityFilter] = useState('All');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [compatReport, setCompatReport] = useState(null);

  useEffect(() => {
    setCompatReport(checkBrowserCompatibility());
  }, []);

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
    }
  }, [currentUser, authToken, historyTypeFilter, historyQualityFilter]);

  const fetchAdminData = async () => {
    if (!authToken) return;
    try {
      // Fetch stats
      const statsData = await apiClient.getAdminStats();
      setAdminStats(statsData.stats);

      // Fetch complaints
      const reportsData = await apiClient.getAdminReports();
      setAdminReports(reportsData.reports);
      
      setAdminError('');
    } catch (err) {
      console.error(err);
      setAdminError('Failed to load admin metrics data.');
    }
  };

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    if (!authToken) return;
    try {
      const data = await apiClient.updateReportStatus(reportId, newStatus);
      setAdminReports(prev => 
        prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r)
      );
    } catch (err) {
      console.error(err);
      showPopup('System Error', 'Error updating safety report status', 'error');
    }
  };

  // Re-fetch admin metrics when portal is opened
  useEffect(() => {
    if (isAdminPortalOpen) {
      fetchAdminData();
    }
  }, [isAdminPortalOpen]);

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

      {/* Admin Moderation Portal View */}
      {!incomingCall && isAdminPortalOpen && (
        <div className="glass-panel admin-portal-view" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} style={{ color: 'var(--color-primary)' }} />
              Admin Moderation Portal
            </h2>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setIsAdminPortalOpen(false)}>
              Close Portal
            </button>
          </div>

          {adminError && (
            <div style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              {adminError}
            </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="stat-card-retro">
              <span className="stat-card-label">TOTAL NODES</span>
              <span className="stat-card-value" style={{ color: 'var(--color-primary)' }}>{adminStats.totalUsers}</span>
            </div>
            <div className="stat-card-retro">
              <span className="stat-card-label">ONLINE NODES</span>
              <span className="stat-card-value" style={{ color: 'var(--color-secondary)' }}>{adminStats.onlineUsers}</span>
            </div>
            <div className="stat-card-retro">
              <span className="stat-card-label">CALLS LOGGED</span>
              <span className="stat-card-value" style={{ color: 'var(--color-accent)' }}>{adminStats.totalCalls}</span>
            </div>
            <div className="stat-card-retro">
              <span className="stat-card-label">FLAGGED CHATS</span>
              <span className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{adminStats.flaggedMessages}</span>
            </div>
          </div>

          {/* Reports Section */}
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={18} />
            Safety Complaints Log
          </h3>
          {adminReports.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>No safety complaints logged.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-retro">
                <thead>
                  <tr>
                    <th>REPORTER</th>
                    <th>REPORTED</th>
                    <th>REASON</th>
                    <th>DETAILS</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {adminReports.map((report) => (
                    <tr key={report.id}>
                      <td style={{ fontWeight: '700' }}>{report.reporter_username}</td>
                      <td style={{ color: 'var(--color-danger)', fontWeight: '700' }}>{report.reported_username}</td>
                      <td>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(190, 77, 77, 0.15)', color: 'var(--color-danger)', fontWeight: 'bold', border: '1px solid var(--color-danger)' }}>
                          {report.reason}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={report.description}>
                        {report.description || 'No description'}
                      </td>
                      <td>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          border: '1px solid currentColor',
                          background: report.status === 'PENDING' ? 'rgba(229, 169, 60, 0.15)' : report.status === 'REVIEWED' ? 'rgba(76, 119, 159, 0.15)' : 'rgba(74, 110, 83, 0.15)',
                          color: report.status === 'PENDING' ? 'var(--color-accent)' : report.status === 'REVIEWED' ? 'var(--color-info)' : 'var(--color-secondary)'
                        }}>
                          {report.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {report.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                              onClick={() => handleUpdateReportStatus(report.id, 'REVIEWED')}
                            >
                              Review
                            </button>
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                              onClick={() => handleUpdateReportStatus(report.id, 'ACTION_TAKEN')}
                            >
                              Resolve
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main Dashboard Stage */}
      {!incomingCall && !isAdminPortalOpen && (
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
                    NODE ID: #{(currentUser.length * 104).toString()}-S &nbsp;|&nbsp; PROTOCOL: P2P WebRTC
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.45rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={() => setIsAdminPortalOpen(!isAdminPortalOpen)}
                disabled={!authToken}
                title={!authToken ? 'Authenticate secure profile to access admin portal' : ''}
              >
                <Shield size={14} />
                {!authToken ? 'Admin (Auth Required)' : 'Admin Controls'}
              </button>
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
            <div className="directory-tab">DIRECTORY.idx</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Users size={20} />
                Active Online Nodes
              </h2>
              <span className="active-count-badge">
                {usersList.filter((u) => (typeof u === 'string' ? u : u.username) !== currentUser).length} ONLINE
              </span>
            </div>

            {usersList.filter((u) => (typeof u === 'string' ? u : u.username) !== currentUser).length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem 2rem' }}>
                No other nodes currently online. Open a second browser tab or window to test live P2P calling!
              </div>
            ) : (
              <div className="active-users-grid">
                {usersList
                  .filter((u) => (typeof u === 'string' ? u : u.username) !== currentUser)
                  .map((user) => {
                    const uname = typeof user === 'string' ? user : user.username;
                    const displayName = typeof user === 'object' && user.name ? user.name : uname;
                    return (
                      <div key={uname} className="active-user-card">
                        <div className="card-header-badge">
                          <div className="node-avatar-circle">
                            {uname.substring(0, 2).toUpperCase()}
                            <span className="node-status-dot"></span>
                          </div>
                          <div className="card-node-info">
                            <span className="node-display-name">{displayName}</span>
                            <span className="node-username-tag">@{uname}</span>
                            <div className="node-meta-pills">
                              <span className="node-pill">#{(uname.length * 104).toString()}-S</span>
                              <span className="node-pill" style={{ color: 'var(--color-secondary)', borderColor: 'var(--color-secondary)' }}>ONLINE</span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem' }}
                          onClick={() => onInitiateCall(uname)}
                          disabled={compatReport?.status === 'Unsupported'}
                        >
                          <Phone size={16} />
                          Call Node
                        </button>
                      </div>
                    );
                  })}
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
