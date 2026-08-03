import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Code, Camera, Cpu, Palette, Music, Smartphone, Server } from 'lucide-react';

const BIOLUMINESCENT_SKILLS = [
  { id: 'react', label: 'React', icon: Code, color: '#61DAFB' },
  { id: 'python', label: 'Python', icon: Code, color: '#3776AB' },
  { id: 'ai', label: 'AI & ML', icon: Cpu, color: '#8B5CF6' },
  { id: 'uiux', label: 'UI/UX Design', icon: Palette, color: '#EC4899' },
  { id: 'photo', label: 'Photography', icon: Camera, color: '#F59E0B' },
  { id: 'music', label: 'Music Sync', icon: Music, color: '#10B981' },
  { id: 'flutter', label: 'Flutter', icon: Smartphone, color: '#02569B' },
  { id: 'node', label: 'Node.js', icon: Server, color: '#339933' }
];

export default function AbyssHero({ onTriggerVortex, onScrollToDemo }) {
  const [activeOrb, setActiveOrb] = useState(null);

  return (
    <div style={{ position: 'relative', zIndex: 1, paddingTop: '110px', paddingBottom: '90px', maxWidth: '1250px', margin: '0 auto', textAlign: 'center', color: '#FFF' }}>
      {/* Abyssal Tag Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(6, 182, 212, 0.12)',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          backdropFilter: 'blur(12px)',
          padding: '0.45rem 1.25rem',
          borderRadius: '50px',
          fontWeight: 800,
          fontSize: '0.82rem',
          letterSpacing: '1px',
          color: '#38BDF8',
          marginBottom: '2rem'
        }}
      >
        <Sparkles size={16} style={{ color: '#06B6D4' }} /> SwaplyOne Beta Platform v2.5.0
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          fontSize: 'clamp(2.6rem, 6.5vw, 4.8rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          margin: '0 auto 1.5rem auto',
          maxWidth: '920px',
          background: 'linear-gradient(135deg, #FFFFFF 20%, #93C5FD 65%, #06B6D4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        In a Deep Ocean of Skills.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: '#94A3B8',
          maxWidth: '680px',
          margin: '0 auto 2.75rem auto',
          lineHeight: 1.65
        }}
      >
        Connect people through skills, not randomness. Peer-to-Peer Encrypted WebRTC Video Communication & Screenshot Protection.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4.5rem' }}
      >
        <button
          onClick={onTriggerVortex}
          style={{
            padding: '0.95rem 2.4rem',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 30px rgba(6, 182, 212, 0.4)',
            color: '#FFF',
            fontWeight: 900,
            fontSize: '0.92rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
        >
          Become a Beta Tester <ArrowRight size={18} />
        </button>

        <button
          onClick={onScrollToDemo}
          style={{
            padding: '0.95rem 2.4rem',
            borderRadius: '50px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.92rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
        >
          <Play size={18} /> Interactive Demo
        </button>
      </motion.div>

      {/* Floating Bioluminescent Skill Spheres */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', padding: '0 1rem' }}>
        {BIOLUMINESCENT_SKILLS.map((skill, index) => {
          const Icon = skill.icon;
          const isActive = activeOrb === skill.id;

          return (
            <motion.div
              key={skill.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isActive ? 1.25 : 1,
                opacity: 1,
                y: [0, -10, 0]
              }}
              transition={{
                y: { duration: 3.2 + index * 0.4, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.2 }
              }}
              onMouseEnter={() => setActiveOrb(skill.id)}
              onMouseLeave={() => setActiveOrb(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.65rem 1.35rem',
                borderRadius: '50px',
                background: isActive ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.65)',
                border: `2px solid ${isActive ? skill.color : 'rgba(255, 255, 255, 0.15)'}`,
                boxShadow: isActive ? `0 0 30px ${skill.color}aa` : '0 10px 25px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(14px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: `${skill.color}22`,
                  color: skill.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon size={17} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#FFF' }}>{skill.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
