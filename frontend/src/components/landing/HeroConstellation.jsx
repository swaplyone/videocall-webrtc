import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Play, ArrowRight, Code, Camera, Cpu, Palette, Music, Smartphone, Server } from 'lucide-react';

const SKILLS = [
  { id: 'react', label: 'React', icon: Code, color: '#61DAFB' },
  { id: 'python', label: 'Python', icon: Code, color: '#3776AB' },
  { id: 'photography', label: 'Photography', icon: Camera, color: '#F59E0B' },
  { id: 'ai', label: 'AI & ML', icon: Cpu, color: '#8B5CF6' },
  { id: 'uiux', label: 'UI/UX Design', icon: Palette, color: '#EC4899' },
  { id: 'music', label: 'Music', icon: Music, color: '#10B981' },
  { id: 'flutter', label: 'Flutter', icon: Smartphone, color: '#02569B' },
  { id: 'nodejs', label: 'Node.js', icon: Server, color: '#339933' }
];

export default function HeroConstellation({ onTriggerVortex, onOpenDemo }) {
  const [hoveredSkill, setHoveredSkill] = useState(null);

  return (
    <div style={{ position: 'relative', zIndex: 1, paddingTop: '100px', paddingBottom: '80px', maxWidth: '1250px', margin: '0 auto', textAlign: 'center', color: '#FFF' }}>
      {/* Platform Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(6, 182, 212, 0.12)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          backdropFilter: 'blur(12px)',
          padding: '0.45rem 1.25rem',
          borderRadius: '50px',
          fontWeight: 800,
          fontSize: '0.85rem',
          letterSpacing: '1px',
          color: '#38BDF8',
          marginBottom: '2rem'
        }}
      >
        <Zap size={16} style={{ color: '#06B6D4' }} /> SwaplyOne Beta Platform v2.5.0
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          margin: '0 auto 1.5rem auto',
          maxWidth: '900px',
          background: 'linear-gradient(135deg, #FFFFFF 30%, #93C5FD 70%, #06B6D4 100%)',
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
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#94A3B8',
          maxWidth: '680px',
          margin: '0 auto 2.5rem auto',
          lineHeight: 1.6
        }}
      >
        Connect people through skills, not randomness. Peer-to-Peer Encrypted WebRTC Video Calls & Screenshot Protection.
      </motion.p>

      {/* Hero CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '4rem' }}
      >
        <button
          onClick={onTriggerVortex}
          style={{
            padding: '0.9rem 2.2rem',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 30px rgba(37, 99, 235, 0.4)',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.95rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
          className="hover:scale-105"
        >
          Become a Beta Tester <ArrowRight size={18} />
        </button>

        <button
          onClick={onOpenDemo}
          style={{
            padding: '0.9rem 2.2rem',
            borderRadius: '50px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.95rem',
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

      {/* Floating Interactive Skill Bubbles */}
      <div style={{ position: 'relative', marginTop: '2rem', minHeight: '140px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0 1rem' }}>
        {SKILLS.map((skill, index) => {
          const Icon = skill.icon;
          const isHovered = hoveredSkill === skill.id;

          return (
            <motion.div
              key={skill.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: isHovered ? 1.2 : 1,
                opacity: 1,
                y: [0, -8, 0]
              }}
              transition={{
                y: { duration: 3 + index * 0.4, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 0.2 }
              }}
              onMouseEnter={() => setHoveredSkill(skill.id)}
              onMouseLeave={() => setHoveredSkill(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '50px',
                background: isHovered ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.7)',
                border: `2px solid ${isHovered ? skill.color : 'rgba(255, 255, 255, 0.15)'}`,
                boxShadow: isHovered ? `0 0 25px ${skill.color}88` : '0 10px 25px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(12px)',
                cursor: 'pointer',
                transition: 'border-color 0.3s ease, background 0.3s ease'
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `${skill.color}22`,
                  color: skill.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Icon size={16} />
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FFF' }}>{skill.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
