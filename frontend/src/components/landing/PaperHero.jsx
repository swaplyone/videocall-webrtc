import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Code, Camera, Cpu, Palette, Music, Smartphone, Server } from 'lucide-react';

const PAPER_STICKERS = [
  { id: 'react', label: 'React', icon: Code, bg: '#FFF', border: '#D45B3E', color: '#D45B3E', shadow: '#2A2723' },
  { id: 'python', label: 'Python', icon: Code, bg: '#FFF', border: '#4A6E53', color: '#4A6E53', shadow: '#2A2723' },
  { id: 'ai', label: 'AI & ML', icon: Cpu, bg: '#FFF', border: '#E5A93C', color: '#E5A93C', shadow: '#2A2723' },
  { id: 'uiux', label: 'UI/UX', icon: Palette, bg: '#FFF', border: '#2A2723', color: '#2A2723', shadow: '#2A2723' },
  { id: 'photo', label: 'Photography', icon: Camera, bg: '#FFF', border: '#D45B3E', color: '#D45B3E', shadow: '#2A2723' },
  { id: 'music', label: 'Music Sync', icon: Music, bg: '#FFF', border: '#4A6E53', color: '#4A6E53', shadow: '#2A2723' }
];

export default function PaperHero({ onTriggerVortex, onScrollToDemo }) {
  const [activeSticker, setActiveSticker] = useState(null);

  return (
    <div style={{ position: 'relative', zIndex: 1, paddingTop: '110px', paddingBottom: '80px', maxWidth: '1200px', margin: '0 auto', textAlign: 'center', color: '#2A2723' }}>
      {/* Paper Badge Tag */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#FFF',
          border: '2.5px solid #2A2723',
          boxShadow: '4px 4px 0px 0px #2A2723',
          padding: '0.45rem 1.2rem',
          borderRadius: '50px',
          fontWeight: 800,
          fontSize: '0.85rem',
          color: '#2A2723',
          marginBottom: '2rem',
          fontFamily: 'var(--font-mono)'
        }}
      >
        <Sparkles size={16} color="#D45B3E" /> SWAPLYONE BETA PLATFORM
      </motion.div>

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
          margin: '0 auto 1.5rem auto',
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
          margin: '0 auto 2.5rem auto',
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
        style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}
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
            fontFamily: 'var(--font-body)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          Become a Beta Tester <ArrowRight size={18} />
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
            fontFamily: 'var(--font-body)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <Play size={18} /> Interactive Demo
        </button>
      </motion.div>

      {/* Tactile Floating Paper Skill Stickers */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', padding: '0 1rem' }}>
        {PAPER_STICKERS.map((sticker, idx) => {
          const Icon = sticker.icon;
          const isActive = activeSticker === sticker.id;

          return (
            <motion.div
              key={sticker.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{
                scale: isActive ? 1.15 : 1,
                opacity: 1,
                y: [0, -6, 0]
              }}
              transition={{
                y: { duration: 3 + idx * 0.3, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.2 }
              }}
              onMouseEnter={() => setActiveSticker(sticker.id)}
              onMouseLeave={() => setActiveSticker(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.3rem',
                borderRadius: '50px',
                background: sticker.bg,
                border: `2.5px solid ${sticker.border}`,
                boxShadow: isActive ? '8px 8px 0px 0px #2A2723' : '5px 5px 0px 0px #2A2723',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.88rem',
                color: '#2A2723',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} color={sticker.color} />
              <span>{sticker.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
