import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowLeft, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';
import OTPInput from '../components/OTPInput';
import { apiClient } from '../utils/apiClient';

export default function VerifyEmailPage({ email: propEmail, verificationToken: propToken, onVerified, onCancel }) {
  const navigate = useNavigate();

  const email = propEmail || sessionStorage.getItem('swaply_pending_email') || 'your email';
  const verificationToken = propToken || sessionStorage.getItem('swaply_pending_token');

  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    console.log(`[Auth] OTP page mounted (email: ${email})`);
  }, [email]);

  // 60-second Countdown Timer for Resend OTP
  useEffect(() => {
    let timer = null;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (otpCode.length < 6 || isSubmitting) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (verificationToken) {
        apiClient.setAuthToken(verificationToken);
      }

      console.log('[Auth] Submitting OTP verification code...');
      const data = await apiClient.request('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ code: otpCode, purpose: 'FIRST_LOGIN' })
      });

      console.log('[Auth] OTP verified -> Received full accessToken');
      const accessToken = data.accessToken || (data.data && data.data.accessToken);
      const user = data.user || (data.data && data.data.user);

      sessionStorage.removeItem('swaply_pending_email');
      sessionStorage.removeItem('swaply_pending_token');

      if (onVerified) {
        onVerified(accessToken, user);
      } else {
        console.log('[Auth] Navigating to /dashboard');
        navigate('/dashboard');
      }
    } catch (err) {
      console.warn('[Auth] OTP verification error:', err);
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Invalid or expired verification code. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setResendMessage('');
    setErrorMessage('');

    try {
      if (verificationToken) {
        apiClient.setAuthToken(verificationToken);
      }
      await apiClient.request('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ purpose: 'FIRST_LOGIN' })
      });
      setResendMessage('A new 6-digit verification code was sent to your email.');
      setResendTimer(60);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    }
  };

  const handleChangeEmail = () => {
    sessionStorage.removeItem('swaply_pending_email');
    sessionStorage.removeItem('swaply_pending_token');
    if (onCancel) {
      onCancel();
    } else {
      navigate('/register');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #F8F3EA)', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'var(--font-mono)' }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#FFFDF8',
          border: '2.5px solid #1B2233',
          boxShadow: '10px 10px 0px 0px #1B2233',
          borderRadius: '24px',
          padding: '2.5rem',
          color: '#1B2233'
        }}
      >
        {/* Header Logo & Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto 0.75rem auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, margin: 0, color: '#1B2233' }}>
            Verify Email Address
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#7A7A7A', margin: '0.35rem 0 0 0' }}>
            Enter the 6-digit verification code sent to:
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#F8F3EA', border: '1.5px solid #1B2233', borderRadius: '50px', padding: '0.35rem 0.85rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 800 }}>
            <Mail size={16} color="#D85B3E" />
            <span>{email}</span>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid #BE4D4D', background: '#FFF0EB', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.25rem', color: '#BE4D4D', fontSize: '0.82rem', fontWeight: 700 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {resendMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid #6D7B55', background: '#F1F6F1', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.25rem', color: '#6D7B55', fontSize: '0.82rem', fontWeight: 700 }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>{resendMessage}</span>
          </div>
        )}

        {/* OTP Input Component */}
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <OTPInput
              value={otpCode}
              onChange={setOtpCode}
              onComplete={(code) => {
                setOtpCode(code);
              }}
              length={6}
            />
          </div>

          <button
            type="submit"
            disabled={otpCode.length < 6 || isSubmitting}
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '50px',
              background: otpCode.length < 6 || isSubmitting ? '#7A7A7A' : '#D85B3E',
              border: '2.5px solid #1B2233',
              boxShadow: otpCode.length < 6 || isSubmitting ? 'none' : '6px 6px 0px 0px #1B2233',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: otpCode.length < 6 || isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontFamily: 'var(--font-body)'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Verifying Code...
              </>
            ) : (
              'Verify & Activate Profile'
            )}
          </button>
        </form>

        {/* Resend & Change Email Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '2px dashed #1B2233' }}>
          
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendTimer > 0}
            style={{
              background: 'none',
              border: 'none',
              color: resendTimer > 0 ? '#7A7A7A' : '#D85B3E',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'var(--font-mono)'
            }}
          >
            <RefreshCw size={14} className={resendTimer === 0 ? 'animate-spin' : ''} />
            {resendTimer > 0 ? `Resend OTP Code in ${resendTimer}s` : 'Resend OTP Code'}
          </button>

          <button
            type="button"
            onClick={handleChangeEmail}
            style={{
              background: 'none',
              border: 'none',
              color: '#1B2233',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontFamily: 'var(--font-mono)',
              textDecoration: 'underline'
            }}
          >
            <ArrowLeft size={14} /> Change Email / Register Again
          </button>

        </div>

      </div>
    </div>
  );
}
