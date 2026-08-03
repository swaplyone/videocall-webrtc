import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, CheckCircle, ArrowRight } from 'lucide-react';

import PaperInteractiveCanvas from '../components/landing/PaperInteractiveCanvas';
import PaperHero from '../components/landing/PaperHero';
import KineticFusionEngine from '../components/landing/KineticFusionEngine';
import FeatureGalaxy from '../components/landing/FeatureGalaxy';
import RefractionPrivacyShield from '../components/landing/RefractionPrivacyShield';
import PaperRegistrationModal from '../components/landing/PaperRegistrationModal';

export default function LandingPage({ currentUser }) {
  const navigate = useNavigate();
  const [vortexActive, setVortexActive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const handleTriggerVortex = () => {
    setVortexActive(true);
  };

  const handleVortexComplete = () => {
    setVortexActive(false);
    setModalOpen(true);
  };

  const faqs = [
    { q: 'How does SwaplyOne protect user privacy during video calls?', a: 'SwaplyOne features zero-trust peer-to-peer WebRTC encryption, tab-blur masking, canvas obfuscation, and active screenshot detection that alerts call participants immediately.' },
    { q: 'How does the Beta Waitlist batch allocation work?', a: 'Users registered on the waitlist are automatically assigned queue positions. Available beta slots (default 150 capacity) are allocated in daily batches with 72-hour invitation claim windows.' },
    { q: 'Can I connect with peers without sharing contact details?', a: 'Yes! Connections are made through skill search or unique Beta IDs (`SWP-XXXXX`) and QR code scanning without ever exposing phone numbers or emails.' }
  ];

  return (
    <div style={{ position: 'relative', background: 'var(--bg-primary, #FAF6EE)', color: '#2A2723', minHeight: '100vh', fontFamily: "var(--font-body), 'Work Sans', sans-serif", overflowX: 'hidden' }}>
      {/* Warm Paper Canvas */}
      <PaperInteractiveCanvas vortexActive={vortexActive} onVortexComplete={handleVortexComplete} />

      {/* Editorial Paper Hero */}
      <PaperHero
        onTriggerVortex={handleTriggerVortex}
        onScrollToDemo={() => {
          const el = document.getElementById('fusion-engine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* KINETIC FUSION ENGINE */}
      <div id="fusion-engine">
        <KineticFusionEngine />
      </div>

      {/* PLATFORM ARCHITECTURE FEATURE GRID */}
      <FeatureGalaxy />

      {/* ANTI-CAPTURE PRIVACY SHIELD */}
      <RefractionPrivacyShield />

      {/* LIVE STATS COUNTER */}
      <div style={{ position: 'relative', zIndex: 1, padding: '4rem 1.5rem', background: '#FFF', borderTop: '2.5px solid #2A2723', borderBottom: '2.5px solid #2A2723' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D45B3E', fontFamily: 'var(--font-display)' }}>150+</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Registered Beta Users</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4A6E53', fontFamily: 'var(--font-display)' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>P2P Encrypted WebRTC</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4C779F', fontFamily: 'var(--font-display)' }}>99.9%</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Email Deliverability</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#E5A93C', fontFamily: 'var(--font-display)' }}>0s</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Server Media Storage</div>
          </div>
        </div>
      </div>

      {/* INFINITE COMMUNITY MARQUEE */}
      <div style={{ position: 'relative', zIndex: 1, padding: '1.25rem 0', background: '#EADFCF', borderBottom: '2.5px solid #2A2723', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'inline-block', animation: 'marquee 25s linear infinite' }}>
          {['PRIVACY FIRST', 'SKILL SHARING', 'ZERO MEDIA STORAGE', 'FRIENDS ONLY', 'SWAPLYONE BETA', 'WEBRTC HD VIDEO', 'P2P ENCRYPTED'].map((tag, i) => (
            <span key={i} style={{ margin: '0 2rem', fontWeight: 800, fontSize: '0.9rem', color: '#2A2723', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
              ✦ {tag}
            </span>
          ))}
        </div>
      </div>

      {/* FAQ ACCORDION */}
      <div style={{ position: 'relative', zIndex: 1, padding: '4.5rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '16px', boxShadow: '4px 4px 0px 0px #2A2723', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                style={{ width: '100%', padding: '1.25rem', background: 'none', border: 'none', color: '#2A2723', fontWeight: 800, fontSize: '1rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                <span>{faq.q}</span>
                <ChevronDown size={20} style={{ transform: openFaqIndex === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>

              {openFaqIndex === idx && (
                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#6B655C', fontSize: '0.92rem', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FINAL CTA FOOTER */}
      <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', textAlign: 'center', background: '#FFF', borderTop: '2.5px solid #2A2723' }}>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
          Ready to Join SwaplyOne?
        </h2>
        <p style={{ color: '#6B655C', fontSize: '1.05rem', maxWidth: '540px', margin: '0 auto 2.25rem auto' }}>
          Reserve your spot in our daily rollout batch and experience privacy-first skill communication.
        </p>
        <button
          onClick={handleTriggerVortex}
          style={{
            padding: '0.95rem 2.4rem',
            borderRadius: '50px',
            background: '#D45B3E',
            border: '2.5px solid #2A2723',
            boxShadow: '6px 6px 0px 0px #2A2723',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)'
          }}
        >
          Become a Beta Tester &rarr;
        </button>

        <div style={{ marginTop: '4rem', color: '#6B655C', fontSize: '0.85rem', borderTop: '2px solid #EADFCF', paddingTop: '2rem', fontFamily: 'var(--font-mono)' }}>
          &copy; 2026 SwaplyOne Inc. "In a Deep Ocean of Skills." &bull; All Rights Reserved.
        </div>
      </div>

      {/* Warm Paper Registration Modal */}
      <PaperRegistrationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
