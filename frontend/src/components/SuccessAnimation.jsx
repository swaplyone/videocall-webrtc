import React from 'react';
import { motion } from 'motion/react';

const CONFETTI_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#10B981'];

export default function SuccessAnimation({ title = 'Phone Verified!', message = 'Security verification complete. Redirecting...' }) {
  // Generate random confetti particles
  const particles = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i / 16) * 360;
    const distance = 60 + Math.random() * 50;
    const rad = (angle * Math.PI) / 180;
    return {
      id: i,
      x: Math.cos(rad) * distance,
      y: Math.sin(rad) * distance,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center', gap: '1.25rem', position: 'relative' }}>
      
      {/* Confetti Explosion Container */}
      <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: [0, 1.2, 0.8],
              opacity: [1, 1, 0],
              rotate: p.rotation + 360
            }}
            transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
            style={{
              position: 'absolute',
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: p.id % 2 === 0 ? '50%' : '2px',
              backgroundColor: p.color
            }}
          />
        ))}

        {/* Growing Green Success Circle */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 1], opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid #047857'
          }}
        >
          {/* SVG Self-Drawing Checkmark */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
              d="M20 6L9 17l-5-5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Success Messages */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
      >
        <h3 style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '1.35rem',
          fontWeight: 900,
          color: '#065F46',
          textTransform: 'uppercase',
          letterSpacing: '0.02em'
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary, #6B655C)',
          maxWidth: '280px',
          margin: '0 auto'
        }}>
          {message}
        </p>
      </motion.div>
    </div>
  );
}
