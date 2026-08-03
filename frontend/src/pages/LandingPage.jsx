import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, ShieldCheck, Zap, Users, Lock, ChevronRight, CheckCircle, HelpCircle } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#FAF6EE', minHeight: '100vh', color: '#111827', fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero Banner */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 1.5rem 2rem 1.5rem', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#FEF3C7',
          border: '2px solid #111827',
          padding: '0.4rem 1rem',
          borderRadius: '50px',
          fontWeight: 900,
          fontSize: '0.85rem',
          boxShadow: '3px 3px 0 #111827',
          marginBottom: '1.5rem'
        }}>
          <Zap size={16} style={{ color: '#D97706' }} /> SwaplyOne Beta Platform v2.5.0
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.15, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          In a Deep Ocean of Skills.
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#4B5563', maxWidth: '680px', margin: '0 auto 2rem auto', lineHeight: 1.5 }}>
          Peer-to-Peer Encrypted WebRTC Video Calls, Instant Friend Connections, and Anti-Capture Screenshot Protection.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/register')}
            className="btn btn-primary"
            style={{ padding: '0.8rem 1.75rem', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Join Beta Waitlist <ChevronRight size={20} />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-secondary"
            style={{ padding: '0.8rem 1.75rem', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase' }}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{ maxWidth: '1100px', margin: '3rem auto', padding: '0 1.5rem' }}>
        <h2 style={{ textAlign: 'center', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.75rem', marginBottom: '2rem' }}>
          Why Choose SwaplyOne?
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#FFF', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', borderRadius: '12px', padding: '1.5rem' }}>
            <ShieldCheck size={32} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, textTransform: 'uppercase' }}>Screenshot Protection</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5 }}>
              Automatic tab-blur masking, canvas obfuscation, and real-time incident warnings if a peer attempts a screenshot.
            </p>
          </div>

          <div style={{ background: '#FFF', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', borderRadius: '12px', padding: '1.5rem' }}>
            <Video size={32} style={{ color: '#10B981', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, textTransform: 'uppercase' }}>HD WebRTC Video Calls</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5 }}>
              Zero-latency direct peer-to-peer WebRTC video stream with dynamic ICE STUN/TURN fallback and live RTCStats.
            </p>
          </div>

          <div style={{ background: '#FFF', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', borderRadius: '12px', padding: '1.5rem' }}>
            <Lock size={32} style={{ color: '#8B5CF6', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, textTransform: 'uppercase' }}>Smart Beta Batch Rollout</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#4B5563', lineHeight: 1.5 }}>
              Fair 72-hour invitation allocations, automated slot management, and unique Beta IDs (`SWP-XXXXX`).
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '3px solid #111827', background: '#FFF', padding: '2rem 1.5rem', textAlign: 'center', marginTop: '4rem' }}>
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>
          &copy; 2026 SwaplyOne Inc. "In a Deep Ocean of Skills." &bull; All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
