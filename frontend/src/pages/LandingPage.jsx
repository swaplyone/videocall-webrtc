import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, CheckCircle, ArrowRight } from 'lucide-react';

import AbyssalFluidCanvas from '../components/landing/AbyssalFluidCanvas';
import AbyssHero from '../components/landing/AbyssHero';
import KineticFusionEngine from '../components/landing/KineticFusionEngine';
import FeatureGalaxy from '../components/landing/FeatureGalaxy';
import RefractionPrivacyShield from '../components/landing/RefractionPrivacyShield';
import AbyssalPortalModal from '../components/landing/AbyssalPortalModal';

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
    <div style={{ position: 'relative', background: '#030712', color: '#FFF', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', overflowX: 'hidden' }}>
      {/* 60 FPS Fluid Abyssal Ocean Canvas */}
      <AbyssalFluidCanvas vortexActive={vortexActive} onVortexComplete={handleVortexComplete} />

      {/* Hero Section with Bioluminescent Skill Orbs */}
      <AbyssHero
        onTriggerVortex={handleTriggerVortex}
        onScrollToDemo={() => {
          const el = document.getElementById('fusion-engine');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* KINETIC FUSION ENGINE (TWILIGHT ZONE 500m) */}
      <div id="fusion-engine">
        <KineticFusionEngine />
      </div>

      {/* FEATURE GALAXY */}
      <FeatureGalaxy />

      {/* REFRACTION PRIVACY SHIELD (MIDNIGHT ZONE 1000m) */}
      <RefractionPrivacyShield />

      {/* LIVE STATS COUNTER */}
      <div style={{ position: 'relative', zIndex: 1, padding: '4rem 1.5rem', background: 'rgba(11, 19, 43, 0.6)', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#38BDF8' }}>150+</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Registered Beta Users</div>
          </div>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#10B981' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>P2P Encrypted WebRTC</div>
          </div>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#EC4899' }}>99.9%</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Email Deliverability</div>
          </div>
          <div>
            <div style={{ fontSize: '2.6rem', fontWeight: 900, color: '#F59E0B' }}>0s</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Server Media Storage</div>
          </div>
        </div>
      </div>

      {/* INFINITE COMMUNITY MARQUEE */}
      <div style={{ position: 'relative', zIndex: 1, padding: '1.5rem 0', background: '#0B132B', overflow: 'hidden', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'inline-block', animation: 'marquee 25s linear infinite' }}>
          {['PRIVACY FIRST', 'SKILL SHARING', 'ZERO MEDIA STORAGE', 'FRIENDS ONLY', 'SWAPLYONE BETA', 'WEBRTC HD VIDEO', 'P2P ENCRYPTED'].map((tag, i) => (
            <span key={i} style={{ margin: '0 2rem', fontWeight: 900, fontSize: '0.9rem', color: '#06B6D4', letterSpacing: '2px' }}>
              ✦ {tag}
            </span>
          ))}
        </div>
      </div>

      {/* FAQ ACCORDION */}
      <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
            Frequently Asked Questions
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                style={{ width: '100%', padding: '1.25rem', background: 'none', border: 'none', color: '#FFF', fontWeight: 800, fontSize: '1rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <span>{faq.q}</span>
                <ChevronDown size={20} style={{ transform: openFaqIndex === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }} />
              </button>

              {openFaqIndex === idx && (
                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FINAL CTA FOOTER */}
      <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', textAlign: 'center', background: 'linear-gradient(180deg, #0B132B, #030712)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Ready to Enter SwaplyOne?
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 2.5rem auto' }}>
          Reserve your spot in our daily rollout batch and experience privacy-first skill communication.
        </p>
        <button
          onClick={handleTriggerVortex}
          style={{
            padding: '1rem 2.5rem',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
            border: 'none',
            color: '#FFF',
            fontWeight: 900,
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            boxShadow: '0 0 35px rgba(6, 182, 212, 0.4)'
          }}
        >
          Become a Beta Tester &rarr;
        </button>

        <div style={{ marginTop: '4rem', color: '#64748B', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '2rem' }}>
          &copy; 2026 SwaplyOne Inc. "In a Deep Ocean of Skills." &bull; All Rights Reserved.
        </div>
      </div>

      {/* Particle Vortex Portal Modal */}
      <AbyssalPortalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
