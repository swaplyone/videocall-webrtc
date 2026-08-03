import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, ShieldCheck, QrCode, Users, Activity, Lock, Mail, Sparkles, X } from 'lucide-react';

const PLANETS = [
  { id: 'calls', label: 'HD WebRTC Video', desc: 'Zero-latency direct peer audio/video streams with STUN/TURN fallback.', icon: Video, color: '#2563EB', bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
  { id: 'privacy', label: 'Anti-Capture Shield', desc: 'Tab-blur masking, canvas obfuscation, and real-time screenshot warnings.', icon: ShieldCheck, color: '#10B981', bg: 'linear-gradient(135deg, #10B981, #047857)' },
  { id: 'qr', label: 'Instant QR Connections', desc: 'One-tap mobile QR invitation scanning and peer verification.', icon: QrCode, color: '#06B6D4', bg: 'linear-gradient(135deg, #06B6D4, #0891B2)' },
  { id: 'friends', label: 'Peer Friend Network', desc: 'Strict invitation-based peer directory & block controls.', icon: Users, color: '#8B5CF6', bg: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
  { id: 'analytics', label: 'RTCStats Inspector', desc: 'Live ping, bitrate, packet loss, jitter, and codec diagnostics.', icon: Activity, color: '#EC4899', bg: 'linear-gradient(135deg, #EC4899, #BE185D)' },
  { id: 'security', label: 'Advanced 2FA Security', desc: 'TOTP Google Authenticator integration & device trust management.', icon: Lock, color: '#F59E0B', bg: 'linear-gradient(135deg, #F59E0B, #D97706)' }
];

export default function FeatureGalaxy() {
  const [selectedPlanet, setSelectedPlanet] = useState(null);

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto', color: '#FFF' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#38BDF8', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Interactive Ecosystem
        </span>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0 0.75rem 0', textTransform: 'uppercase' }}>
          The SwaplyOne Feature Galaxy
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '1.05rem', maxWidth: '640px', margin: '0 auto' }}>
          Explore our interconnected ecosystem. Click any planetary node to inspect technical specifications.
        </p>
      </div>

      {/* Galaxy Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
        {PLANETS.map((planet, index) => {
          const Icon = planet.icon;
          return (
            <motion.div
              key={planet.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
              onClick={() => setSelectedPlanet(planet)}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '1.75rem',
                backdropFilter: 'blur(12px)',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Planetary Core */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: planet.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 20px ${planet.color}aa`
                }}
              >
                <Icon size={26} color="#FFF" />
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontWeight: 900, fontSize: '1.2rem' }}>{planet.label}</h3>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.5 }}>{planet.desc}</p>
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: planet.color, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: 'auto' }}>
                Inspect Planet Node &rarr;
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Planet Detail Modal */}
      <AnimatePresence>
        {selectedPlanet && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                background: '#0F172A',
                border: `2px solid ${selectedPlanet.color}`,
                borderRadius: '24px',
                padding: '2rem',
                maxWidth: '480px',
                width: '100%',
                boxShadow: `0 0 40px ${selectedPlanet.color}66`,
                position: 'relative'
              }}
            >
              <button
                onClick={() => setSelectedPlanet(null)}
                style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: selectedPlanet.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {React.createElement(selectedPlanet.icon, { size: 24, color: '#FFF' })}
                </div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.3rem' }}>{selectedPlanet.label}</h3>
              </div>

              <p style={{ color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.6 }}>{selectedPlanet.desc}</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
