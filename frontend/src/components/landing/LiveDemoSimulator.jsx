import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, ShieldCheck, UserCheck, UserX, QrCode, PhoneCall, Sparkles, CheckCircle } from 'lucide-react';

export default function LiveDemoSimulator() {
  const [activeTab, setActiveTab] = useState('swipe'); // swipe, connect, qr
  const [callActive, setCallActive] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  const sampleUsers = [
    { name: 'Alice Smith', handle: '@alice', skill: 'React & WebRTC', avatarBg: '#2563EB', location: 'San Francisco' },
    { name: 'Bob Chen', handle: '@bob', skill: 'AI & Python', avatarBg: '#8B5CF6', location: 'London' },
    { name: 'Carol Vance', handle: '@carol', skill: 'UI/UX Design', avatarBg: '#EC4899', location: 'Tokyo' },
    { name: 'David Miller', handle: '@david', skill: 'Cybersecurity', avatarBg: '#10B981', location: 'Berlin' }
  ];

  const currentProfile = sampleUsers[cardIndex % sampleUsers.length];

  const handleSwipe = (direction) => {
    setCardIndex(prev => prev + 1);
    if (direction === 'right') {
      setCallActive(true);
      setTimeout(() => setCallActive(false), 4000);
    }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#FFF' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#38BDF8', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Interactive Sandbox
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0 0.75rem 0', textTransform: 'uppercase' }}>
          Live Interactive Platform Demo
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Try swiping peer requests, simulating peer connections, and launching encrypted WebRTC calls right here.
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        {[
          { id: 'swipe', label: '🎴 Swipe Requests' },
          { id: 'connect', label: '🤝 Drag & Connect' },
          { id: 'qr', label: '📷 QR Code Sync' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '30px',
              border: `1.5px solid ${activeTab === t.id ? '#06B6D4' : 'rgba(255,255,255,0.15)'}`,
              background: activeTab === t.id ? 'rgba(6, 182, 212, 0.15)' : 'rgba(15, 23, 42, 0.6)',
              color: activeTab === t.id ? '#38BDF8' : '#94A3B8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Interactive Stage Panel */}
      <div
        style={{
          maxWidth: '560px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          borderRadius: '24px',
          padding: '2rem',
          backdropFilter: 'blur(16px)',
          minHeight: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {callActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: '#0F172A',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justify: 'center',
              gap: '1rem',
              padding: '1.5rem'
            }}
          >
            <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', background: currentProfile.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
              {currentProfile.name[0]}
              <span style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', background: '#10B981', border: '3px solid #0F172A', borderRadius: '50%' }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 900 }}>Call Connected with {currentProfile.name}</h3>
              <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 800 }}>🟢 Encrypted WebRTC Session (720p HD)</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
              <span>Ping: 22ms</span> &bull; <span>Bitrate: 1850kbps</span> &bull; <span>FPS: 30</span>
            </div>
          </motion.div>
        )}

        {activeTab === 'swipe' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={cardIndex}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                style={{
                  background: 'rgba(30, 41, 59, 0.9)',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  borderRadius: '18px',
                  padding: '1.5rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: currentProfile.avatarBg, margin: '0 auto 1rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 900 }}>
                  {currentProfile.name[0]}
                </div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>{currentProfile.name}</h3>
                <span style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: 800 }}>{currentProfile.handle}</span>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
                  Skill: <strong>{currentProfile.skill}</strong> &bull; {currentProfile.location}
                </p>
              </motion.div>
            </AnimatePresence>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => handleSwipe('left')}
                style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: '1.5px solid #EF4444', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Decline"
              >
                <UserX size={22} />
              </button>
              <button
                onClick={() => handleSwipe('right')}
                style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '1.5px solid #10B981', color: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Accept & Call"
              >
                <UserCheck size={22} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'connect' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '1.5rem' }}>
              Click button below to initiate simulated Peer Connection handshaking:
            </p>
            <button
              onClick={() => {
                setCallActive(true);
                setTimeout(() => setCallActive(false), 4000);
              }}
              style={{
                padding: '0.8rem 1.75rem',
                borderRadius: '50px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                color: '#FFF',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <PhoneCall size={18} /> Connect Direct Peer Stream
            </button>
          </div>
        )}

        {activeTab === 'qr' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#FFF', padding: '1rem', borderRadius: '12px', border: '2px solid #06B6D4' }}>
              <QrCode size={120} color="#0F172A" />
            </div>
            <span style={{ fontSize: '0.85rem', color: '#38BDF8', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
              SWP-FOUNDER-QR-TOKEN
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
