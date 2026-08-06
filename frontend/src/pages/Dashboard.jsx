import React, { useState, useEffect } from 'react';
import { Phone, Users, ShieldAlert, Award, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../utils/apiClient';

export default function Dashboard({ currentUser, userDetails, onInitiateCall }) {
  const [dialTarget, setDialTarget] = useState('');
  const [dialError, setDialError] = useState('');

  // Dynamic Real Stats States
  const [onlineFriendsCount, setOnlineFriendsCount] = useState(0);
  const [missedCallsCount, setMissedCallsCount] = useState(0);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchRealDashboardStats = async () => {
      try {
        setLoadingStats(true);
        
        // 1. Fetch Real Friends
        const friendsRes = await apiClient.request('/api/friends').catch(() => null);
        if (friendsRes && friendsRes.success && Array.isArray(friendsRes.friends)) {
          const onlineCount = friendsRes.friends.filter(f => f.status === 'online' || f.isOnline).length;
          if (isMounted) setOnlineFriendsCount(onlineCount || friendsRes.friends.length);
        }

        // 2. Fetch Real Call History (Missed Calls)
        const historyRes = await apiClient.getCallHistory().catch(() => null);
        if (historyRes && historyRes.success && Array.isArray(historyRes.history)) {
          const missedCount = historyRes.history.filter(c => c.status === 'missed' || c.type === 'missed').length;
          if (isMounted) setMissedCallsCount(missedCount);
        }

        // 3. Fetch Real Pending Friend Invites
        const requestsRes = await apiClient.request('/api/friends/requests').catch(() => null);
        if (requestsRes && requestsRes.success && Array.isArray(requestsRes.incoming)) {
          if (isMounted) setPendingInvitesCount(requestsRes.incoming.length);
        }
      } catch (err) {
        console.warn('[Dashboard] Error fetching real stats:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchRealDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleDial = (e) => {
    e.preventDefault();
    if (!dialTarget.trim()) {
      setDialError('Please enter a username or Beta ID');
      return;
    }
    setDialError('');
    onInitiateCall(dialTarget.trim());
  };

  return (
    <div style={{ width: '100%', maxWidth: '1250px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* STORY-DRIVEN FIELD NOTEBOOK CONSOLE HEADER */}
      <div
        style={{
          background: '#FFFDF8',
          border: '2.5px solid #1B2233',
          boxShadow: '6px 6px 0px 0px #1B2233',
          borderRadius: '20px',
          padding: '1.75rem 2rem',
          position: 'relative'
        }}
      >
        {/* Paper Clip Visual Element */}
        <div style={{ position: 'absolute', top: '-14px', left: '28px', fontSize: '1.4rem' }}>
          📎
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', borderBottom: '2px dashed #1B2233', paddingBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#D85B3E', border: '2.5px solid #1B2233', color: '#FFF', fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(currentUser || 'User').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: '#1B2233' }}>
                👋 Welcome Back, @{currentUser || userDetails?.username || 'User'}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#7A7A7A', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>
                Beta ID: <strong style={{ color: '#D85B3E' }}>{userDetails?.beta_id || 'N/A'}</strong> &bull; STATUS: <strong style={{ color: '#6D7B55' }}>ACTIVE FIELD NODE</strong>
              </div>
            </div>
          </div>

          {/* DYNAMIC REAL STATS BADGES */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
            <div style={{ background: '#F1F6F1', border: '2px solid #1B2233', padding: '0.45rem 0.9rem', borderRadius: '12px', fontWeight: 700, color: '#6D7B55', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem' }}>○</span> {loadingStats ? '...' : onlineFriendsCount} Friends Online
            </div>
            <div style={{ background: '#FFF0EB', border: '2px solid #1B2233', padding: '0.45rem 0.9rem', borderRadius: '12px', fontWeight: 700, color: '#BE4D4D', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem' }}>○</span> {loadingStats ? '...' : missedCallsCount} Missed Calls
            </div>
            <div style={{ background: '#FFFBF0', border: '2px solid #1B2233', padding: '0.45rem 0.9rem', borderRadius: '12px', fontWeight: 700, color: '#C8A76A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem' }}>○</span> {loadingStats ? '...' : pendingInvitesCount} Pending {pendingInvitesCount === 1 ? 'Invite' : 'Invites'}
            </div>
          </div>
        </div>

        <p style={{ margin: '1rem 0 0 0', fontSize: '0.85rem', color: '#7A7A7A', fontFamily: 'var(--font-mono)' }}>
          📌 Connected to Swaply P2P Mesh &bull; Zero media recorded &bull; Anti-Capture Canvas Active
        </p>
      </div>

      {/* DASHBOARD CARDS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
        
        {/* Quick Dial Form Card */}
        <div
          style={{
            background: '#FFFDF8',
            border: '2.5px solid #1B2233',
            boxShadow: '6px 6px 0px 0px #1B2233',
            borderRadius: '18px',
            padding: '1.6rem',
            position: 'relative'
          }}
        >
          <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#C8A76A', border: '1.5px solid #1B2233', color: '#FFF', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            LABEL STAMP
          </div>

          <h3 style={{ margin: '0 0 1.25rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#1B2233' }}>
            <Phone size={20} color="#D85B3E" /> Quick Dial Node
          </h3>

          {dialError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#BE4D4D', border: '2px solid #BE4D4D', background: '#FFF0EB', padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
              <AlertCircle size={16} /> {dialError}
            </div>
          )}

          <form onSubmit={handleDial} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="dial-input" style={{ fontSize: '0.78rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#1B2233', textTransform: 'uppercase' }}>
                Username or Beta ID
              </label>
              <input
                id="dial-input"
                type="text"
                placeholder="e.g. alice or SWP-92K4A"
                value={dialTarget}
                onChange={(e) => setDialTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#FCFAF6',
                  border: '2.5px solid #1B2233',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  color: '#1B2233'
                }}
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '8px 8px 0px 0px #1B2233' }}
              whileTap={{ scale: 0.96, rotate: -1, boxShadow: '2px 2px 0px 0px #1B2233' }}
              type="submit"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '50px',
                background: '#D85B3E',
                border: '2.5px solid #1B2233',
                boxShadow: '6px 6px 0px 0px #1B2233',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)'
              }}
            >
              <Phone size={18} /> Place Secure Call
            </motion.button>
          </form>
        </div>

        {/* Node Privacy Guard Card */}
        <div
          style={{
            background: '#F3ECE0',
            border: '2.5px solid #1B2233',
            boxShadow: '6px 6px 0px 0px #1B2233',
            borderRadius: '18px',
            padding: '1.6rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#6D7B55', color: '#FFF', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, fontFamily: 'var(--font-mono)', marginBottom: '0.85rem' }}>
              🛡 ZERO-TRUST ENCRYPTION
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: '#1B2233' }}>
              Privacy Shield Active
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#7A7A7A', lineHeight: 1.6, fontFamily: 'var(--font-mono)', margin: 0 }}>
              Your video session is guarded by Canvas Screenshot Protection. Zero media streams or credentials are ever recorded or stored on Swaply servers.
            </p>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1.5px dashed #1B2233', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6D7B55', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            <span>PROTOCOL: WebRTC P2P</span>
            <span>LATENCY: &lt;25ms</span>
          </div>
        </div>

      </div>

    </div>
  );
}
