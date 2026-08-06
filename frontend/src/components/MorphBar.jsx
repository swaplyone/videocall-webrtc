import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Search,
  Users,
  Phone,
  Shield,
  ShieldCheck,
  Power,
  X,
  User,
  Settings,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  ArrowRight,
  Sparkles,
  Command,
  Clock
} from 'lucide-react';
import SwaplyLogo from './SwaplyLogo';

export default function MorphBar({
  currentUser,
  userDetails,
  onLogout,
  incomingCall,
  onAcceptCall,
  onRejectCall,
  activeCallSession,
  onHangUpCall,
  friendRequestNotice,
  securityAlertNotice,
  notificationNotice
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const barRef = useRef(null);

  // Core Morph State: 'idle' | 'search' | 'friend_request' | 'incoming_call' | 'active_call' | 'notification' | 'qr_scanner' | 'security_alert' | 'admin_panel' | 'profile'
  const [mode, setMode] = useState('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [callTimer, setCallTimer] = useState(0);

  // Active call audio/video controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  // 1. Reactive Mode Overrides based on system events
  useEffect(() => {
    if (incomingCall) {
      setMode('incoming_call');
    } else if (activeCallSession) {
      setMode('active_call');
    } else if (securityAlertNotice) {
      setMode('security_alert');
    } else if (friendRequestNotice) {
      setMode('friend_request');
    } else if (notificationNotice) {
      setMode('notification');
    }
  }, [incomingCall, activeCallSession, securityAlertNotice, friendRequestNotice, notificationNotice]);

  // 2. Active Call Timer
  useEffect(() => {
    let interval = null;
    if (mode === 'active_call') {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode]);

  // 3. Global Ctrl+K / Cmd+K Keyboard Shortcut for Search Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMode(prev => (prev === 'search' ? 'idle' : 'search'));
      } else if (e.key === 'Escape' && mode !== 'idle' && mode !== 'active_call' && mode !== 'incoming_call') {
        setMode('idle');
      }
    };

    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        if (mode !== 'active_call' && mode !== 'incoming_call') {
          setMode('idle');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mode]);

  // Format call duration MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Navigation Items for Search Mode
  const quickActions = [
    { label: 'Go to Dialer', path: '/dashboard', icon: <Phone size={16} color="#D85B3E" /> },
    { label: 'View Peers & Invites', path: '/friends', icon: <Users size={16} color="#6D7B55" /> },
    { label: 'Recent Call History', path: '/call-history', icon: <Clock size={16} color="#4C779F" /> },
    { label: 'Privacy & Security', path: '/privacy', icon: <Shield size={16} color="#C8A76A" /> },
    { label: 'Account Settings', path: '/settings', icon: <Settings size={16} color="#7A7A7A" /> }
  ];

  if (userDetails?.is_admin) {
    quickActions.push({ label: 'Admin Command Hub', path: '/admin', icon: <ShieldCheck size={16} color="#BE4D4D" /> });
  }

  // Smooth Spring Motion Transition Settings
  const springTransition = {
    type: 'spring',
    stiffness: 380,
    damping: 30,
    mass: 0.8
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: 0,
        right: 0,
        zIndex: 10000,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        padding: '0 16px'
      }}
      ref={barRef}
    >
      <LayoutGroup>
        <motion.div
          layout
          transition={springTransition}
          style={{
            pointerEvents: 'auto',
            background: '#FFFDF8',
            border: '2.5px solid #1B2233',
            boxShadow: '6px 6px 0px 0px #1B2233',
            borderRadius: mode === 'idle' ? '50px' : '24px',
            overflow: 'hidden',
            color: '#1B2233',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {/* ==================== 1. IDLE MODE ==================== */}
          {mode === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 0.85rem',
                cursor: 'pointer'
              }}
            >
              <div
                onClick={() => setMode('search')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                title="Click or press Ctrl+K to morph into Command Center"
              >
                <SwaplyLogo size={22} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                  Swaply
                </span>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6D7B55', boxShadow: '0 0 6px #6D7B55' }} />
              </div>

              <div style={{ width: '1.5px', height: '16px', background: 'rgba(27, 34, 51, 0.2)', margin: '0 0.1rem' }} />

              {/* Quick Search Launcher Pill */}
              <button
                onClick={() => setMode('search')}
                style={{
                  background: '#F8F3EA',
                  border: '1.5px solid #1B2233',
                  borderRadius: '20px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#1B2233'
                }}
              >
                <Search size={12} color="#D85B3E" />
                <span style={{ display: 'inline', fontSize: '0.7rem' }}>Ctrl+K</span>
              </button>

              {/* Profile Avatar Pill */}
              <div
                onClick={() => setMode('profile')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#D85B3E',
                  color: '#FFF',
                  border: '1.5px solid #1B2233',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Open Profile Morph Bar"
              >
                {(currentUser || 'U').substring(0, 2).toUpperCase()}
              </div>
            </motion.div>
          )}

          {/* ==================== 2. SEARCH / COMMAND MODE ==================== */}
          {mode === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: 'min(92vw, 500px)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              {/* Top Search Input Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '2px dashed #1B2233', paddingBottom: '0.75rem' }}>
                <Search size={20} color="#D85B3E" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type to search peers, skills, Beta IDs, or commands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.95rem',
                    fontFamily: 'var(--font-mono)',
                    color: '#1B2233'
                  }}
                />
                <button
                  onClick={() => setMode('idle')}
                  style={{ background: '#F8F3EA', border: '1.5px solid #1B2233', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Quick Actions & Navigation List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '280px', overflowY: 'auto' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Quick Navigation
                </span>
                {quickActions
                  .filter(a => a.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((act, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        navigate(act.path);
                        setMode('idle');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '12px',
                        background: '#F8F3EA',
                        border: '1.5px solid #1B2233',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                    >
                      {act.icon}
                      <span>{act.label}</span>
                      <ArrowRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                    </div>
                  ))}
              </div>
            </motion.div>
          )}

          {/* ==================== 3. INCOMING CALL MORPH ==================== */}
          {mode === 'incoming_call' && (
            <motion.div
              key="incoming_call"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: 'min(92vw, 440px)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                background: '#FFFDF8'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#D85B3E', color: '#FFF', border: '2px solid #1B2233', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                  {(incomingCall?.from || 'Node').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#BE4D4D', fontWeight: 800, textTransform: 'uppercase' }}>
                    🔒 Incoming Call Offer
                  </span>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-display)' }}>
                    @{incomingCall?.from || 'Unknown Peer'}
                  </h4>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    if (onAcceptCall) onAcceptCall(incomingCall?.sessionId);
                  }}
                  style={{ padding: '0.5rem 1rem', borderRadius: '50px', background: '#6D7B55', border: '2px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Accept
                </button>
                <button
                  onClick={() => {
                    if (onRejectCall) onRejectCall(incomingCall?.sessionId);
                    setMode('idle');
                  }}
                  style={{ padding: '0.5rem 1rem', borderRadius: '50px', background: '#BE4D4D', border: '2px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Decline
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== 4. ACTIVE CALL CONTROLS ==================== */}
          {mode === 'active_call' && (
            <motion.div
              key="active_call"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                width: 'min(92vw, 460px)',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#BE4D4D', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  Secure Call &bull; {formatTime(callTimer)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: isMicMuted ? '#BE4D4D' : '#F8F3EA', border: '1.5px solid #1B2233', color: isMicMuted ? '#FFF' : '#1B2233', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={() => setIsCamOff(!isCamOff)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', background: isCamOff ? '#BE4D4D' : '#F8F3EA', border: '1.5px solid #1B2233', color: isCamOff ? '#FFF' : '#1B2233', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {isCamOff ? <CameraOff size={16} /> : <Camera size={16} />}
                </button>
                <button
                  onClick={() => {
                    if (onHangUpCall) onHangUpCall();
                    setMode('idle');
                  }}
                  style={{ padding: '0.45rem 0.85rem', borderRadius: '50px', background: '#BE4D4D', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <PhoneOff size={14} /> End
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== 5. INCOMING FRIEND REQUEST MORPH ==================== */}
          {mode === 'friend_request' && (
            <motion.div
              key="friend_request"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                width: 'min(92vw, 420px)',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.2rem' }}>👤</span>
                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                  {friendRequestNotice?.sender || 'Peer'} wants to connect
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => setMode('idle')}
                  style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#6D7B55', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Accept
                </button>
                <button
                  onClick={() => setMode('idle')}
                  style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#F8F3EA', border: '1.5px solid #1B2233', color: '#1B2233', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Ignore
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== 6. NOTIFICATION CAPSULE ==================== */}
          {mode === 'notification' && (
            <motion.div
              key="notification"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '0.65rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: '#F1F6F1'
              }}
            >
              <CheckCircle size={18} color="#6D7B55" />
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#6D7B55' }}>
                {notificationNotice || 'Action Completed Successfully'}
              </span>
              <button onClick={() => setMode('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem' }}>
                <X size={14} color="#6D7B55" />
              </button>
            </motion.div>
          )}

          {/* ==================== 7. PROFILE MORPH MODE ==================== */}
          {mode === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: 'min(92vw, 360px)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px dashed #1B2233', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#D85B3E', color: '#FFF', border: '2px solid #1B2233', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {(currentUser || 'U').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
                      @{currentUser || 'founder'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#D85B3E', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      Beta ID: {userDetails?.beta_id || 'SWP-ACTIVE'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setMode('idle')} style={{ background: '#F8F3EA', border: '1.5px solid #1B2233', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  onClick={() => { navigate('/profile'); setMode('idle'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '12px', background: '#F8F3EA', border: '1.5px solid #1B2233', color: '#1B2233', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <User size={16} color="#D85B3E" /> View Full Profile
                </button>

                <button
                  onClick={() => { navigate('/settings'); setMode('idle'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '12px', background: '#F8F3EA', border: '1.5px solid #1B2233', color: '#1B2233', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <Settings size={16} color="#4C779F" /> Preferences & Hardware
                </button>

                <button
                  onClick={() => {
                    if (onLogout) onLogout();
                    setMode('idle');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.85rem', borderRadius: '12px', background: '#FFF0EB', border: '1.5px solid #BE4D4D', color: '#BE4D4D', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.25rem' }}
                >
                  <Power size={16} /> Disconnect Session
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== 8. SECURITY ALERT MORPH ==================== */}
          {mode === 'security_alert' && (
            <motion.div
              key="security_alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                width: 'min(92vw, 440px)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                background: '#FFF0EB'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#BE4D4D', fontWeight: 800 }}>
                <Shield size={18} />
                <span>🛡 New Login Attempt Detected</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#1B2233' }}>
                Location: New York, US &bull; Device: Chrome (macOS)
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setMode('idle')} style={{ flex: 1, padding: '0.45rem', borderRadius: '50px', background: '#6D7B55', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Trust Device
                </button>
                <button onClick={() => { navigate('/security'); setMode('idle'); }} style={{ flex: 1, padding: '0.45rem', borderRadius: '50px', background: '#BE4D4D', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Review Activity
                </button>
              </div>
            </motion.div>
          )}

        </motion.div>
      </LayoutGroup>
    </div>
  );
}
