import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, EyeOff, Lock, Camera, AlertTriangle } from 'lucide-react';

export default function RefractionPrivacyShield() {
  const [shieldTriggered, setShieldTriggered] = useState(false);
  const [auditLog, setAuditLog] = useState([
    { id: 1, text: 'P2P_SIGNAL_ENCRYPTED_AES256', time: '21:34:04' },
    { id: 2, text: 'CANVAS_ANTI_CAPTURE_ACTIVE', time: '21:34:05' }
  ]);

  const handleSimulateCapture = () => {
    setShieldTriggered(true);
    const newEntry = {
      id: Date.now(),
      text: 'SCREENSHOT_ATTEMPT_BLOCKED (PrintScreen Detected)',
      time: new Date().toLocaleTimeString()
    };
    setAuditLog(prev => [newEntry, ...prev]);

    setTimeout(() => {
      setShieldTriggered(false);
    }, 3800);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '4.5rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#2A2723' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4A6E53', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          Zero-Trust Privacy Engine
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
          Anti-Capture Screen Obfuscation
        </h2>
        <p style={{ color: '#6B655C', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          SwaplyOne actively detects screen capture attempts to protect peer privacy during video calls.
        </p>
      </div>

      {/* Tactile Paper Frame */}
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          background: '#FFF',
          border: '2.5px solid #2A2723',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '8px 8px 0px 0px #2A2723'
        }}
      >
        {/* Frame Header */}
        <div style={{ background: '#FAF6EE', padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #2A2723' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="#4A6E53" />
            <strong style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>Swaply Anti-Capture Guard</strong>
          </div>
          <button
            onClick={handleSimulateCapture}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '30px',
              background: '#D45B3E',
              border: '2px solid #2A2723',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'var(--font-mono)',
              boxShadow: '3px 3px 0px 0px #2A2723'
            }}
          >
            <Camera size={14} /> Simulate PrintScreen
          </button>
        </div>

        {/* Canvas Display View */}
        <div style={{ position: 'relative', height: '280px', background: '#F4EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {shieldTriggered ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#BE4D4D',
                  color: '#FFF',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '0.75rem',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}
              >
                <AlertTriangle size={48} color="#FFF" />
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>
                  SCREENSHOT ATTEMPT DETECTED
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '420px', color: '#FEE2E2', fontFamily: 'var(--font-body)' }}>
                  Video stream obfuscated. Security warning logged to session audit log.
                </p>
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', color: '#2A2723' }}>
                <Lock size={46} color="#4A6E53" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>P2P Encrypted Session Protected</h4>
                <span style={{ fontSize: '0.8rem', color: '#4A6E53', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>🟢 Anti-Capture Guard Active</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Audit Log Footer */}
        <div style={{ background: '#FAF6EE', padding: '1rem 1.25rem', borderTop: '2.5px solid #2A2723' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Security Audit Stream
          </span>
          <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            {auditLog.slice(0, 3).map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', color: log.text.includes('BLOCKED') ? '#BE4D4D' : '#2A2723' }}>
                <span>&bull; {log.text}</span>
                <span>{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
