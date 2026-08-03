import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Sparkles, UserCheck, PhoneCall, Zap, RefreshCw } from 'lucide-react';

export default function KineticFusionEngine() {
  const [fused, setFused] = useState(false);
  const [activeCall, setActiveCall] = useState(false);

  const handleFuseNodes = () => {
    setFused(true);
    setTimeout(() => {
      setActiveCall(true);
    }, 600);
  };

  const handleReset = () => {
    setFused(false);
    setActiveCall(false);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#FFF' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#06B6D4', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Kinetic Peer Fusion
        </span>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0 0.75rem 0', textTransform: 'uppercase' }}>
          Connect Skills Through Fusion
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>
          Click or drag nodes together to fuse peer skill energies and launch a zero-latency WebRTC encrypted video call.
        </p>
      </div>

      {/* Fusion Stage Container */}
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '24px',
          padding: '2.5rem 1.5rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
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
        {activeCall ? (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px #10B981aa' }}>
              <Video size={40} color="#FFF" />
            </div>

            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.4rem' }}>P2P WebRTC Video Stream Active</h3>
              <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 800 }}>🟢 Encrypted Session Established (@founder &bull; @peer_alice)</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem' }}>
              <span>Latency: 18ms</span> &bull; <span>Resolution: 1280x720 (720p HD)</span> &bull; <span>Codec: Opus / VP8</span>
            </div>

            <button
              onClick={handleReset}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '30px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <RefreshCw size={14} /> Reset Fusion Stage
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fused ? '0px' : '4rem', transition: 'gap 0.5s cubic-bezier(0.23, 1, 0.32, 1)' }}>
              {/* Skill Energy Node 1 */}
              <motion.div
                animate={{ scale: fused ? 1.2 : 1 }}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  border: '2px solid #60A5FA',
                  boxShadow: '0 0 35px #2563EBaa',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  fontWeight: 900,
                  fontSize: '0.85rem'
                }}
              >
                <span>React</span>
                <span style={{ fontSize: '0.7rem', color: '#93C5FD' }}>@founder</span>
              </motion.div>

              {/* Energy Shockwave Ring */}
              {fused && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    position: 'absolute',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    border: '3px solid #06B6D4',
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Skill Energy Node 2 */}
              <motion.div
                animate={{ scale: fused ? 1.2 : 1 }}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #06B6D4, #0891B2)',
                  border: '2px solid #67E8F9',
                  boxShadow: '0 0 35px #06B6D4aa',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  fontWeight: 900,
                  fontSize: '0.85rem'
                }}
              >
                <span>AI & ML</span>
                <span style={{ fontSize: '0.7rem', color: '#A5F3FC' }}>@alice</span>
              </motion.div>
            </div>

            <button
              onClick={handleFuseNodes}
              style={{
                padding: '0.85rem 2.2rem',
                borderRadius: '50px',
                background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
                border: 'none',
                color: '#FFF',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.4)'
              }}
            >
              <Zap size={18} /> Fuse Energy Nodes & Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
