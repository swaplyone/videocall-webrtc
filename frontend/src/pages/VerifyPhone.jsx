import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomSheet from '../components/BottomSheet';
import { ShieldCheck, Phone, ArrowLeft } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';

export default function VerifyPhone({ onVerified }) {
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('+1 (555) 019-2834');

  const handleVerifySubmit = async (code) => {
    // Verification callback
    console.log('[VerifyPhone] Submitting verification code:', code);
    if (code === '000000') {
      throw new Error('Invalid verification code. Use 123456 or any 6 digits.');
    }
  };

  const handleResendOtp = async () => {
    console.log('[VerifyPhone] Resending SMS verification code...');
  };

  const handleClose = () => {
    setIsSheetOpen(false);
    if (onVerified) {
      onVerified();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app, #FAF6EE)', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
      
      {/* Background Page Content (Remains visible behind blurred bottom sheet) */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem', border: '4px solid #111827', boxShadow: '8px 8px 0px #111827', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto 0.5rem auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, textTransform: 'uppercase' }}>Phone Verification</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Security Setup & Identity Verification</p>
        </div>

        <div style={{ border: '2px solid #111827', background: '#FFFFFF', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Phone size={20} style={{ color: 'var(--color-primary)' }} />
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Registered Phone Number</span>
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{phoneNumber}</strong>
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          onClick={() => setIsSheetOpen(true)}
        >
          <ShieldCheck size={18} /> Open OTP Bottom Sheet
        </button>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>

      {/* Premium OTP Verification Bottom Sheet Component */}
      <BottomSheet
        isOpen={isSheetOpen}
        phoneNumber={phoneNumber}
        onVerifySubmit={handleVerifySubmit}
        onResendOtp={handleResendOtp}
        onClose={handleClose}
        showCancel={true}
      />
    </div>
  );
}
