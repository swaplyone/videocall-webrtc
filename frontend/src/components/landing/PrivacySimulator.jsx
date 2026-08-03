import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, Lock, EyeOff, Camera, CheckCircle2 } from 'lucide-react';

export default function PrivacySimulator() {
  const [incidentTriggered, setIncidentTriggered] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, event: 'ENCRYPTED_SIGNAL_INITIALIZED', timestamp: '21:02:14' },
    { id: 2, event: 'STUN_TURN_ICE_ACCEPTED', timestamp: '21:02:15' }
  ]);

  const handleSimulateScreenshot = () => {
    setIncidentTriggered(true);
    const newLog = {
      id: Date.now(),
      event: 'SCREENSHOT_DETECTED (PrintScreen Pressed)',
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev]);

    setTimeout(() => {
      setIncidentTriggered(false);
    }, 3500);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#FFF' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#10B981', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Zero-Trust Privacy Engine
        </span>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0 0.75rem 0', textTransform: 'uppercase' }}>
          Anti-Capture Screenshot Protection
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
          SwaplyOne actively detects screen captures, tab defocusing, and canvas snapshot attempts to safeguard your video calls.
        </p>
      </div>

      {/* Interactive Browser Frame */}
      <div
        style={{
          maxWidth: '750px',
          margin: '0 auto',
          background: '#0F172A',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
        }}
      >
        {/* Browser Top Bar */}
        <div style={{ background: '#1E293B', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
          </div>
          <div style={{ flex: 1, background: '#0F172A', borderRadius: '6px', padding: '0.3rem 0.8rem', fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
            https://swaplyone.in/call/session-active
          </div>
          <button
            onClick={handleSimulateScreenshot}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '6px',
              background: '#EF4444',
              border: 'none',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Camera size={14} /> Simulate PrintScreen
          </button>
        </div>

        {/* Browser Video Canvas View */}
        <div style={{ position: 'relative', height: '280px', background: '#050816', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence>
            {incidentTriggered ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(239, 68, 68, 0.9)',
                  backdropFilter: 'blur(20px)',
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
                <EyeOff size={48} color="#FFF" />
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem' }}>⚠️ SCREENSHOT CAPTURE DETECTED</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '420px', color: '#FEE2E2' }}>
                  Video stream obfuscated. Security warning logged to admin audit table and sent to call peers.
                </p>
              </motion.div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94A3B8' }}>
                <ShieldCheck size={48} color="#10B981" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: 0, color: '#FFF', fontWeight: 800 }}>Encrypted Peer Stream Protected</h4>
                <span style={{ fontSize: '0.8rem', color: '#10B981' }}>Anti-capture canvas active</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Real-time Audit Table */}
        <div style={{ background: '#1E293B', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Live Security Event Audit Log
          </span>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
            {logs.slice(0, 3).map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', color: log.event.includes('SCREENSHOT') ? '#F87171' : '#CBD5E1' }}>
                <span>&bull; {log.event}</span>
                <span>{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
