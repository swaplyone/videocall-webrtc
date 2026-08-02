import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import OTPInput from './OTPInput';
import LoadingSpinner from './LoadingSpinner';
import SuccessAnimation from './SuccessAnimation';

export default function BottomSheet({
  isOpen = true,
  email = '',
  phoneNumber = '',
  title,
  subtitle,
  onVerifySubmit,
  onResendOtp,
  onClose,
  showCancel = false
}) {
  const [otpValue, setOtpValue] = useState('');
  const [status, setStatus] = useState('IDLE'); // 'IDLE' | 'VERIFYING' | 'SUCCESS' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState('');

  // Determine if verifying Email or Phone
  const isEmailVerification = Boolean(email && (!phoneNumber || email.includes('@')));
  const displayTitle = title || (isEmailVerification ? 'Verify your email address' : 'Verify your phone number');
  const successTitle = isEmailVerification ? 'Email Verified!' : 'Phone Verified!';
  const targetAddress = isEmailVerification ? email : (phoneNumber || email);

  // Timers
  const [expiresIn, setExpiresIn] = useState(300);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const t = setInterval(() => setExpiresIn((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [expiresIn]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleOTPComplete = async (code) => {
    setErrorMessage('');
    setStatus('VERIFYING');

    const startTime = Date.now();
    try {
      if (onVerifySubmit) {
        await onVerifySubmit(code);
      }
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        setStatus('SUCCESS');
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      }, remainingDelay);
    } catch (err) {
      setTimeout(() => {
        setStatus('ERROR');
        setErrorMessage(err.message || 'Invalid verification code. Please try again.');
      }, 800);
    }
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage('');
    try {
      if (onResendOtp) await onResendOtp();
      setResendCooldown(60);
      setExpiresIn(300);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
          
          {/* Blurred Overlay / Darkened Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              if (showCancel && onClose) onClose();
            }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(17, 24, 39, 0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 1
            }}
          />

          {/* Spring Animated Bottom Sheet Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
              bounce: 0.15
            }}
            drag={showCancel ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (showCancel && info.offset.y > 140 && onClose) {
                onClose();
              }
            }}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              maxWidth: '520px',
              margin: '0 auto',
              maxHeight: '75vh',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              background: '#FFFFFF',
              border: '3px solid #111827',
              borderBottom: 'none',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Top Drag Handle */}
            <div style={{ width: '100%', padding: '12px 0 6px 0', display: 'flex', justifyContent: 'center', cursor: showCancel ? 'grab' : 'default' }}>
              <div style={{ width: '48px', height: '5px', borderRadius: '3px', backgroundColor: '#E5E7EB' }} />
            </div>

            {/* Sheet Body Content */}
            <div style={{ padding: '1.25rem 2rem 2.25rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              
              {status === 'SUCCESS' ? (
                <SuccessAnimation
                  title={successTitle}
                  message={`Security setup verified for ${targetAddress}.`}
                />
              ) : status === 'VERIFYING' ? (
                <LoadingSpinner text="Verifying Code..." />
              ) : (
                <>
                  {/* Top Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: [0.8, 1.1, 1] }}
                      transition={{ duration: 0.5, type: 'spring' }}
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(212, 91, 62, 0.1)',
                        border: '2px solid var(--color-primary, #D45B3E)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-primary, #D45B3E)',
                        boxShadow: '0 0 20px rgba(212, 91, 62, 0.2)',
                        marginBottom: '0.85rem'
                      }}
                    >
                      <Shield size={28} />
                    </motion.div>

                    <h2 style={{
                      fontFamily: 'var(--font-display, sans-serif)',
                      fontSize: '1.4rem',
                      fontWeight: 900,
                      color: 'var(--text-primary, #111827)',
                      margin: '0 0 0.35rem 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.01em'
                    }}>
                      {displayTitle}
                    </h2>
                    
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6B655C)', margin: 0, lineHeight: 1.4 }}>
                      {subtitle || `Enter the 6-digit OTP code sent to:`}<br />
                      <strong style={{ color: '#111827', fontFamily: 'var(--font-mono, monospace)' }}>
                        {targetAddress}
                      </strong>
                    </p>
                  </div>

                  {/* Error Notification */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '2px solid var(--color-danger, #BE4D4D)',
                        backgroundColor: 'rgba(190, 77, 77, 0.08)',
                        color: 'var(--color-danger, #BE4D4D)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  {/* OTP 6-Box Input Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <OTPInput
                      value={otpValue}
                      onChange={setOtpValue}
                      onComplete={handleOTPComplete}
                      isLocked={status === 'VERIFYING'}
                      length={6}
                    />

                    {/* Timer & Resend Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '320px', fontSize: '0.8rem', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary, #6B655C)', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: expiresIn < 60 ? 'var(--color-danger, #BE4D4D)' : 'inherit' }}>
                        <Clock size={15} />
                        {expiresIn > 0 ? `Expires ${formatTime(expiresIn)}` : 'Code expired'}
                      </span>

                      {resendCooldown > 0 ? (
                        <span>Resend in {resendCooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendClick}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary, #D45B3E)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textDecoration: 'underline',
                            padding: 0
                          }}
                        >
                          <RefreshCw size={13} /> Resend Code
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Continue Button with Ripple & Hover Animation */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {showCancel && onClose && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ flex: 1, padding: '0.75rem', fontWeight: 'bold' }}
                      >
                        Cancel
                      </button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (otpValue.length === 6) {
                          handleOTPComplete(otpValue);
                        } else {
                          setErrorMessage('Please enter all 6 digits.');
                        }
                      }}
                      disabled={otpValue.length < 6 || status === 'VERIFYING'}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: '0.8rem',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '4px 4px 0 #111827',
                        opacity: otpValue.length < 6 ? 0.6 : 1,
                        cursor: otpValue.length < 6 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Continue
                    </motion.button>
                  </div>
                </>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
