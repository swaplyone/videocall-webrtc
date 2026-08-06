import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play } from 'lucide-react';
import CinematicStickyScene from './CinematicStickyScene';

export default function PaperHero({ onTriggerVortex, onScrollToDemo }) {
  return (
    <div style={{ position: 'relative', zIndex: 1, paddingTop: '110px', paddingBottom: '50px', maxWidth: '1250px', margin: '0 auto', textAlign: 'center', color: '#2A2723', overflow: 'visible' }}>
      {/* Main Editorial Headline */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 800,
          fontFamily: "var(--font-display), 'Syne', sans-serif",
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          color: '#2A2723',
          margin: '0 auto 1.25rem auto',
          maxWidth: '900px'
        }}
      >
        In a Deep Ocean of Skills.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: '#6B655C',
          maxWidth: '650px',
          margin: '0 auto 2.25rem auto',
          lineHeight: 1.6,
          fontFamily: 'var(--font-body)'
        }}
      >
        Connect people through skills, not randomness. Peer-to-Peer Encrypted WebRTC Video Communication & Screenshot Protection.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}
      >
        <button
          onClick={onTriggerVortex}
          style={{
            padding: '0.9rem 2.2rem',
            borderRadius: '50px',
            background: '#D45B3E',
            border: '2.5px solid #2A2723',
            boxShadow: '6px 6px 0px 0px #2A2723',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-body)'
          }}
        >
          Go to Dialer <ArrowRight size={18} />
        </button>

        <button
          onClick={onScrollToDemo}
          style={{
            padding: '0.9rem 2.2rem',
            borderRadius: '50px',
            background: '#FFF',
            border: '2.5px solid #2A2723',
            boxShadow: '6px 6px 0px 0px #2A2723',
            color: '#2A2723',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-body)'
          }}
        >
          <Play size={18} /> Interactive Demo
        </button>
      </motion.div>

      {/* 3D Cinematic Parallax Draggable Sticky Notes Scene */}
      <CinematicStickyScene />
    </div>
  );
}
