import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function PendingDeletionModal({ isOpen, data, onRestored, onKeepScheduled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !data) return null;

  const handleCancelDeletion = async () => {
    setLoading(true);
    setError(null);
    try {
      if (data.tempToken) {
        apiClient.setAuthToken(data.tempToken);
      }

      const res = await apiClient.request('/api/account/delete/cancel', {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (res.success) {
        if (onRestored) onRestored(res.user || data.user, data.tempToken);
      } else {
        setError(res.error || 'Failed to cancel deletion schedule.');
      }
    } catch (err) {
      setError(err.message || 'Server error cancelling deletion schedule.');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = data.scheduled_deletion_at
    ? new Date(data.scheduled_deletion_at).toLocaleString()
    : '5 hours after request';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(17, 24, 39, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '4px solid #111827',
        borderRadius: '16px',
        boxShadow: '8px 8px 0px #111827',
        width: '100%',
        maxWidth: '480px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        position: 'relative'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#FEE2E2',
            border: '2px solid #EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444'
          }}>
            <ShieldAlert size={26} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.01em',
              color: '#111827'
            }}>
              Account Scheduled For Deletion
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
              @{data.user?.username || 'User Account'}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '2px solid #EF4444',
            color: '#991B1B',
            padding: '0.6rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
            {error}
          </div>
        )}

        {/* Warning Notice Box */}
        <div style={{
          background: '#FFFBEB',
          border: '2px solid #F59E0B',
          borderRadius: '8px',
          padding: '1rem',
          fontSize: '0.875rem',
          color: '#92400E',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertTriangle size={18} /> Scheduled Deletion Notice
          </div>
          <div>
            Your account is currently scheduled to be permanently purged on:<br />
            <strong style={{ color: '#78350F', fontFamily: 'var(--font-mono)' }}>{formattedDate}</strong>
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '0.25rem' }}>
            Are you sure you want to cancel the deletion schedule and restore full access to your account?
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCancelDeletion}
            disabled={loading}
            style={{
              padding: '0.75rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#10B981',
              borderColor: '#111827',
              color: '#FFFFFF'
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
            {loading ? 'Restoring Account...' : 'Cancel Deletion & Recover Account'}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onKeepScheduled}
            disabled={loading}
            style={{
              padding: '0.6rem',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}
          >
            Keep Scheduled For Deletion
          </button>
        </div>
      </div>
    </div>
  );
}
