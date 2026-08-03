import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, ShieldCheck, QrCode, Users, Activity, Lock, X } from 'lucide-react';

const PLANETS = [
  { id: 'calls', label: 'HD WebRTC Video', desc: 'Direct peer audio/video streams with STUN/TURN fallback.', icon: Video, color: '#D45B3E', bg: '#FFF0EB' },
  { id: 'privacy', label: 'Anti-Capture Shield', desc: 'Tab-blur masking, canvas obfuscation, and real-time screenshot warnings.', icon: ShieldCheck, color: '#4A6E53', bg: '#F1F6F1' },
  { id: 'qr', label: 'Instant QR Sync', desc: 'One-tap mobile QR invitation scanning and peer verification.', icon: QrCode, color: '#4C779F', bg: '#F0F5FA' },
  { id: 'friends', label: 'Peer Friend Directory', desc: 'Strict invitation-based peer directory & block controls.', icon: Users, color: '#2A2723', bg: '#FAF6EE' },
  { id: 'analytics', label: 'RTCStats Inspector', desc: 'Live ping, bitrate, packet loss, jitter, and codec diagnostics.', icon: Activity, color: '#E5A93C', bg: '#FFFBF0' },
  { id: 'security', label: 'Advanced 2FA Security', desc: 'TOTP Google Authenticator integration & device trust management.', icon: Lock, color: '#BE4D4D', bg: '#FDF2F2' }
];

export default function FeatureGalaxy() {
  const [selectedPlanet, setSelectedPlanet] = useState(null);

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '4.5rem 1.5rem', maxWidth: '1200px', margin: '0 auto', color: '#2A2723' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          Tactile Ecosystem
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
          The SwaplyOne Platform Architecture
        </h2>
        <p style={{ color: '#6B655C', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Explore our features. Click any card to inspect technical specifications.
        </p>
      </div>

      {/* Feature Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {PLANETS.map((planet, index) => {
          const Icon = planet.icon;
          return (
            <motion.div
              key={planet.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedPlanet(planet)}
              style={{
                background: '#FFF',
                border: '2.5px solid #2A2723',
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                boxShadow: '6px 6px 0px 0px #2A2723',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.15s ease'
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: planet.bg,
                  border: `2px solid ${planet.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '3px 3px 0px 0px #2A2723'
                }}
              >
                <Icon size={24} color={planet.color} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.3rem 0', fontWeight: 800, fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>{planet.label}</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B655C', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{planet.desc}</p>
              </div>

              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: planet.color, fontFamily: 'var(--font-mono)', marginTop: 'auto' }}>
                Inspect Specifications &rarr;
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Feature Detail Modal */}
      <AnimatePresence>
        {selectedPlanet && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(42, 39, 35, 0.6)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: '#FFF',
                border: '2.5px solid #2A2723',
                borderRadius: '20px',
                padding: '2rem',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '10px 10px 0px 0px #2A2723',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setSelectedPlanet(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#2A2723', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: selectedPlanet.bg, border: `2px solid ${selectedPlanet.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {React.createElement(selectedPlanet.icon, { size: 22, color: selectedPlanet.color })}
                </div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>{selectedPlanet.label}</h3>
              </div>

              <p style={{ color: '#6B655C', fontSize: '0.92rem', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>{selectedPlanet.desc}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
