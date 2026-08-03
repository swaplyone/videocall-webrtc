import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, EyeOff, Lock, Camera, AlertOctagon } from 'lucide-react';

export default function RefractionPrivacyShield() {
  const [shieldTriggered, setShieldTriggered] = useState(false);
  const [auditLog, setAuditLog] = useState([
    { id: 1, text: 'P2P_SIGNAL_ENCRYPTED_AES256', time: '21:18:04' },
    { id: 2, text: 'CANVAS_ANTI_CAPTURE_ACTIVE', time: '21:18:05' }
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
    }, 4000);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#FFF' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#10B981', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Midnight Privacy Matrix
        </span>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0 0.75rem 0', textTransform: 'uppercase' }}>
          Anti-Capture Screen Obfuscation
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>
          SwaplyOne actively detects tab defocusing, screen captures, and external recording tools to protect video privacy.
        </p>
      </div>

      {/* Simulator Container */}
      <div
        style={{
          maxWidth: '750px',
          margin: '0 auto',
          background: '#0B132B',
          border: '2px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 0 50px rgba(16, 185, 129, 0.15)'
        }}
      >
        {/* Frame Top */}
        <div style={{ background: '#1C2541', padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} color="#10B981" />
            <strong style={{ fontSize: '0.85rem' }}>Swaply Shield Anti-Capture Guard</strong>
          </div>
          <button
            onClick={handleSimulateCapture}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '30px',
              background: '#EF4444',
              border: 'none',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
            }}
          >
            <Camera size={14} /> Simulate PrintScreen
          </button>
        </div>

        {/* Video Canvas Sandbox */}
        <div style={{ position: 'relative', height: '300px', background: '#050816', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {shieldTriggered ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(239, 68, 68, 0.92)',
                  backdropFilter: 'blur(25px)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '0.85rem',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}
              >
                <AlertOctagon size={52} color="#FFF" />
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase' }}>
                  ⚠️ SCREENSHOT ATTEMPT BLOCKED
                </h3>
                <p style={{ margin: 0, fontSize: '0.92rem', maxWidth: '440px', color: '#FEE2E2' }}>
                  Video stream immediately obfuscated. Real-time security incident alert sent to peer video session.
                </p>
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                <Lock size={52} color="#10B981" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ margin: 0, color: '#FFF', fontWeight: 900, fontSize: '1.2rem' }}>P2P Encrypted Session Protected</h4>
                <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 800 }}>🟢 Refraction Canvas Active</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Audit Log Footer */}
        <div style={{ background: '#1C2541', padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Security Audit Stream
          </span>
          <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            {auditLog.slice(0, 3).map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', color: log.text.includes('BLOCKED') ? '#F87171' : '#CBD5E1' }}>
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
