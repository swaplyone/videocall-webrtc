import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, RefreshCw, Zap } from 'lucide-react';

export default function KineticFusionEngine() {
  const [fused, setFused] = useState(false);
  const [activeCall, setActiveCall] = useState(false);

  const handleFuseNodes = () => {
    setFused(true);
    setTimeout(() => {
      setActiveCall(true);
    }, 500);
  };

  const handleReset = () => {
    setFused(false);
    setActiveCall(false);
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#2A2723' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          Tactile Peer Connection
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
          Connect Skills Through Fusion
        </h2>
        <p style={{ color: '#6B655C', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Fuse peer skill badges to establish direct WebRTC encrypted video calls.
        </p>
      </div>

      {/* Tactile Paper Stage */}
      <div
        style={{
          maxWidth: '680px',
          margin: '0 auto',
          background: '#FFF',
          border: '2.5px solid #2A2723',
          borderRadius: '20px',
          padding: '2.5rem 1.5rem',
          boxShadow: '8px 8px 0px 0px #2A2723',
          minHeight: '360px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          position: 'relative'
        }}
      >
        {activeCall ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
          >
            <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#4A6E53', border: '2.5px solid #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0px 0px #2A2723' }}>
              <Video size={36} color="#FFF" />
            </div>

            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-display)' }}>
                Encrypted WebRTC Session Active
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#4A6E53', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                🟢 Direct Peer Connection Established (@founder &bull; @alice)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: '#FAF6EE', border: '2px solid #2A2723', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              <span>Latency: 18ms</span> &bull; <span>Resolution: 720p HD</span> &bull; <span>Codec: VP8</span>
            </div>

            <button
              onClick={handleReset}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1.25rem',
                borderRadius: '30px',
                background: '#FAF6EE',
                border: '2px solid #2A2723',
                color: '#2A2723',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <RefreshCw size={14} /> Reset Stage
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fused ? '10px' : '4rem', transition: 'gap 0.4s ease' }}>
              {/* Skill Badge 1 */}
              <motion.div
                style={{
                  width: '95px',
                  height: '95px',
                  borderRadius: '50%',
                  background: '#FFF0EB',
                  border: '2.5px solid #D45B3E',
                  boxShadow: '4px 4px 0px 0px #2A2723',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: '#D45B3E',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span>React</span>
                <span style={{ fontSize: '0.7rem', color: '#2A2723' }}>@founder</span>
              </motion.div>

              {/* Skill Badge 2 */}
              <motion.div
                style={{
                  width: '95px',
                  height: '95px',
                  borderRadius: '50%',
                  background: '#F1F6F1',
                  border: '2.5px solid #4A6E53',
                  boxShadow: '4px 4px 0px 0px #2A2723',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justify: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: '#4A6E53',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span>AI & ML</span>
                <span style={{ fontSize: '0.7rem', color: '#2A2723' }}>@alice</span>
              </motion.div>
            </div>

            <button
              onClick={handleFuseNodes}
              style={{
                padding: '0.85rem 2.2rem',
                borderRadius: '50px',
                background: '#D45B3E',
                border: '2.5px solid #2A2723',
                boxShadow: '4px 4px 0px 0px #2A2723',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)'
              }}
            >
              <Zap size={18} /> Fuse Skill Badges & Connect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
