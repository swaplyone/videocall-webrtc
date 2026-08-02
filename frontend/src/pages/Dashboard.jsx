import React, { useState } from 'react';
import { Phone, Users, ShieldAlert, Award, AlertCircle } from 'lucide-react';

export default function Dashboard({ currentUser, userDetails, onInitiateCall }) {
  const [dialTarget, setDialTarget] = useState('');
  const [dialError, setDialError] = useState('');

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Welcome Console */}
      <div className="glass-panel" style={{ padding: '1.8rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.75rem', fontWeight: 900 }}>
          Swaply Console
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Welcome back, <strong style={{ color: 'var(--text-primary)' }}>@{currentUser}</strong>! Logged in and secure.
        </p>
        {userDetails && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FEF3C7', padding: '0.3rem 0.6rem', border: '1.5px solid #111827', borderRadius: '4px', marginTop: '0.5rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
            <Award size={14} style={{ color: '#D97706' }} /> Beta ID: {userDetails.beta_id || 'SWP-ACTIVE'}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Quick Dial Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827' }}>
          <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '1.1rem', fontWeight: 800 }}>
            <Phone size={18} style={{ color: 'var(--color-primary)' }} /> Quick Dial Node
          </h3>
          {dialError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-danger)', border: '1.5px solid var(--color-danger)', background: 'rgba(239,68,68,0.05)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <AlertCircle size={14} /> {dialError}
            </div>
          )}
          <form onSubmit={handleDial} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div className="input-group">
              <label htmlFor="dial-input" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Username or Beta ID</label>
              <input
                id="dial-input"
                type="text"
                placeholder="e.g. alice or SWP-92K4A"
                value={dialTarget}
                onChange={(e) => setDialTarget(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              <Phone size={16} /> Place Secure Call
            </button>
          </form>
        </div>

        {/* Node Status Info */}
        <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 800 }}>
            🛡 Privacy Shield Active
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
            Your connection is guarded by best-effort screenshot and browser capture event risk filters. Any capture risk signals or screen sharing attempts will be reported immediately to both you and the backend mod system.
          </p>
        </div>
      </div>

    </div>
  );
}
