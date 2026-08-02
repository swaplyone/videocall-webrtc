import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Lock, CheckCircle } from 'lucide-react';
import DeleteCountdown from './DeleteCountdown';
import { apiClient } from '../utils/apiClient';

export default function RecoveryBanner({ scheduledTime, remainingSeconds, onRestored }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleCancelDeletion = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.request('/api/account/delete/cancel', {
        method: 'POST',
        body: JSON.stringify({ password })
      });

      if (res.success) {
        setSuccessMsg('Account deletion cancelled! Full access restored.');
        setShowPasswordModal(false);
        if (onRestored) onRestored();
      } else {
        setError(res.error || 'Failed to recover account.');
      }
    } catch (err) {
      setError(err.message || 'Server error recovering account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '0.75rem 0' }}>
      {/* Recovery Banner Card */}
      <div style={{
        background: '#FFF5F5',
        border: '3px solid #111827',
        borderRadius: '8px',
        padding: '0.9rem 1.1rem',
        boxShadow: '4px 4px 0 #111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={26} style={{ color: '#E11D48', flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#991B1B', display: 'block', textTransform: 'uppercase' }}>
              ⚠ Account Scheduled for Deletion
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#4B5563' }}>
              Your account is currently hidden. You can recover it before the grace period expires.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <DeleteCountdown remainingSeconds={remainingSeconds} scheduledTime={scheduledTime} />
          <button 
            className="btn btn-primary"
            onClick={() => setShowPasswordModal(true)}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#10B981', borderColor: '#111827', color: '#FFF' }}
          >
            <RefreshCw size={14} />
            Recover Account
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{
          background: '#ECFDF5',
          border: '2px solid #111827',
          borderRadius: '6px',
          padding: '0.6rem 0.8rem',
          color: '#047857',
          fontWeight: 'bold',
          marginTop: '0.5rem',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      {/* Password Verification Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFF',
            border: '3px solid #111827',
            borderRadius: '10px',
            maxWidth: '420px',
            width: '100%',
            padding: '1.25rem',
            boxShadow: '6px 6px 0 #111827'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>
              Confirm Account Recovery
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginBottom: '1rem' }}>
              Please enter your password to cancel scheduled deletion and restore full access.
            </p>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', padding: '0.5rem', borderRadius: '4px', color: '#B91C1C', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCancelDeletion} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                <input 
                  type="password"
                  className="form-control"
                  placeholder="Account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                  style={{ flex: 1, padding: '0.4rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.4rem', background: '#10B981', borderColor: '#111827', color: '#FFF' }}
                  disabled={loading}
                >
                  {loading ? 'Restoring...' : 'Confirm Recovery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
