import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, Video, Users, ChevronDown, CheckCircle, ArrowRight, Lock, HelpCircle } from 'lucide-react';

import OceanCanvas from '../components/landing/OceanCanvas';
import HeroConstellation from '../components/landing/HeroConstellation';
import LiveDemoSimulator from '../components/landing/LiveDemoSimulator';
import FeatureGalaxy from '../components/landing/FeatureGalaxy';
import PrivacySimulator from '../components/landing/PrivacySimulator';
import VortexRegistrationModal from '../components/landing/VortexRegistrationModal';

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
    <div style={{ position: 'relative', background: '#050816', color: '#FFF', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', overflowX: 'hidden' }}>
      {/* 60 FPS Fluid Ocean Particle Background */}
      <OceanCanvas vortexActive={vortexActive} onVortexComplete={handleVortexComplete} />

      {/* Hero Constellation */}
      <HeroConstellation
        onTriggerVortex={handleTriggerVortex}
        onOpenDemo={() => {
          const el = document.getElementById('sandbox-demo');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* SECTION 2: HOW IT WORKS STORY */}
      <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#38BDF8', letterSpacing: '2px', textTransform: 'uppercase' }}>
          The Journey
        </span>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0 2.5rem 0', textTransform: 'uppercase' }}>
          How SwaplyOne Works
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {[
            { step: '01', title: 'Discover Skills', desc: 'Browse peer profiles by expertise' },
            { step: '02', title: 'Connect', desc: 'Send invitation or scan QR token' },
            { step: '03', title: 'Become Friends', desc: 'Establish trusted friend status' },
            { step: '04', title: 'Video Call', desc: 'Launch P2P WebRTC HD stream' },
            { step: '05', title: 'Grow Together', desc: 'Exchange skills & collaborate' }
          ].map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1.5px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '18px',
                padding: '1.5rem',
                backdropFilter: 'blur(12px)',
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#06B6D4', display: 'block', marginBottom: '0.5rem' }}>{item.step}</span>
              <h3 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, fontSize: '1.1rem' }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.5 }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SECTION 3: FEATURE GALAXY */}
      <FeatureGalaxy />

      {/* SECTION 4: LIVE DEMO SANDBOX */}
      <div id="sandbox-demo">
        <LiveDemoSimulator />
      </div>

      {/* SECTION 5: PRIVACY SIMULATOR */}
      <PrivacySimulator />

      {/* LIVE STATS COUNTER */}
      <div style={{ position: 'relative', zIndex: 1, padding: '4rem 1.5rem', background: 'rgba(15, 23, 42, 0.6)', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38BDF8' }}>150+</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Registered Beta Users</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10B981' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>P2P Encrypted WebRTC</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#EC4899' }}>99.9%</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Email Deliverability</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#F59E0B' }}>0s</div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Server Media Storage</div>
          </div>
        </div>
      </div>

      {/* INFINITE COMMUNITY MARQUEE */}
      <div style={{ position: 'relative', zIndex: 1, padding: '1.5rem 0', background: '#0F172A', overflow: 'hidden', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'inline-block', animation: 'marquee 25s linear infinite' }}>
          {['PRIVACY FIRST', 'SKILL SHARING', 'ZERO MEDIA STORAGE', 'FRIENDS ONLY', 'SWAPLYONE BETA', 'NEO-BRUTALIST PAPER BRANDING', 'WEBRTC HD VIDEO'].map((tag, i) => (
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
      <div style={{ position: 'relative', zIndex: 1, padding: '5rem 1.5rem', textAlign: 'center', background: 'linear-gradient(180deg, #050816, #030712)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>
          Ready to Join SwaplyOne?
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

      {/* Ultimate Wow Moment Vortex Beta Registration Modal */}
      <VortexRegistrationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
