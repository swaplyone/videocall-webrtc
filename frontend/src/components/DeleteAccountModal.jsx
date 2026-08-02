import React, { useState } from 'react';
import { ShieldAlert, X, AlertOctagon, CheckSquare, Square, Lock, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function DeleteAccountModal({ isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Please check the confirmation box before proceeding.');
      return;
    }
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.request('/api/account/delete/request', {
        method: 'POST',
        body: JSON.stringify({ password, reason })
      });

      if (res.success) {
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        setError(res.error || 'Failed to request account deletion.');
      }
    } catch (err) {
      setError(err.message || 'Server error submitting deletion request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
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
        borderRadius: '12px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '6px 6px 0 #111827',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: '#FEE2E2',
          borderBottom: '3px solid #111827',
          padding: '1rem 1.25rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={22} style={{ color: '#E11D48' }} />
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: '#991B1B' }}>
              Schedule Account Deletion
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {error && (
            <div style={{
              background: '#FEE2E2',
              border: '2px solid #111827',
              padding: '0.6rem 0.8rem',
              borderRadius: '6px',
              color: '#991B1B',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <AlertOctagon size={16} />
              {error}
            </div>
          )}

          {/* Consequences Checklist */}
          <div style={{
            background: '#FFFDF9',
            border: '2px solid #111827',
            borderRadius: '8px',
            padding: '0.9rem',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem'
          }}>
            <strong style={{ textTransform: 'uppercase', color: '#111827', marginBottom: '0.2rem' }}>
              ⚠ What happens when you request deletion:
            </strong>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li><strong>Immediate Session Lockdown:</strong> You will be logged out of all active devices.</li>
              <li><strong>Search & Discovery Hidden:</strong> Your profile will be hidden from search, QR scanner, and incoming calls.</li>
              <li><strong>5-Hour Grace Period:</strong> You can log back in anytime within 5 hours to cancel deletion and recover your account.</li>
              <li><strong>Permanent Data Cleanup:</strong> After 5 hours, all profile data, friends, call logs, and messages will be permanently deleted.</li>
            </ul>
          </div>

          {/* Optional Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Reason for leaving (Optional)
            </label>
            <input 
              type="text"
              className="form-control"
              placeholder="Tell us why you are deleting your account..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Password Confirmation */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Confirm Account Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input 
                type="password"
                className="form-control"
                placeholder="Enter current password to verify"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                required
              />
            </div>
          </div>

          {/* Checkbox */}
          <div 
            onClick={() => setConfirmed(!confirmed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              userSelect: 'none',
              padding: '0.4rem 0'
            }}
          >
            {confirmed ? <CheckSquare size={20} style={{ color: '#E11D48' }} /> : <Square size={20} style={{ color: '#6B7280' }} />}
            <span>I understand my account will be permanently deleted after 5 hours unless recovered.</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1, padding: '0.5rem' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1.5, padding: '0.5rem', background: '#E11D48', borderColor: '#111827', color: '#FFF' }}
              disabled={loading || !confirmed || !password}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Schedule Deletion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
