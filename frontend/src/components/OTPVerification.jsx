import React, { useState, useEffect } from 'react';
import { Shield, Clock, AlertTriangle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function OTPVerification({ email, tempToken, purpose = 'FIRST_LOGIN', onVerified, onCancel }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timer states
  const [expiresIn, setExpiresIn] = useState(300); // 5 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(0); // 60 seconds resend cooldown
  
  // Expiration countdown
  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresIn]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError('Please enter a 6-digit verification code.');
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Configure temporary token for verification request
      apiClient.setAuthToken(tempToken);
      const data = await apiClient.verifyOtp(code.trim(), purpose);
      if (data.success) {
        onVerified(data.accessToken, data.user);
      } else {
        setError(data.error || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      apiClient.setAuthToken(tempToken);
      await apiClient.resendOtp(purpose);
      setResendCooldown(60);
      setExpiresIn(300); // Reset expiration timer
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(17, 24, 39, 0.95)' }}>
      <div className="modal-content" style={{ maxWidth: '420px', border: '4px solid #111827', boxShadow: '8px 8px 0px #111827' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--color-primary)', display: 'inline-flex', padding: '0.8rem', borderRadius: '8px', border: '3px solid #111827', boxShadow: '3px 3px 0 #111827', marginBottom: '1rem' }}>
            <Shield size={32} style={{ color: '#111827' }} />
          </div>
          <h2 className="modal-title" style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900 }}>Verify Your Email</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            We sent a 6-digit verification code to:<br />
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify}>
          <div className="input-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="otp-code" style={{ fontWeight: 'bold', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Code</label>
            <input
              id="otp-code"
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              placeholder="e.g. 123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              style={{
                fontSize: '1.5rem',
                letterSpacing: '0.5rem',
                textAlign: 'center',
                padding: '0.8rem',
                border: '3px solid #111827',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                background: '#FFFDF9',
                boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)'
              }}
              autoFocus
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: expiresIn < 60 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
              <Clock size={16} />
              {expiresIn > 0 ? `Expires in ${formatTime(expiresIn)}` : 'Code expired'}
            </span>
            {resendCooldown > 0 ? (
              <span style={{ color: 'var(--text-secondary)' }}>Resend in {resendCooldown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Resend Code
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              style={{ flex: 1, padding: '0.65rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || expiresIn <= 0}
              style={{ flex: 2, padding: '0.65rem' }}
            >
              {isSubmitting ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
