import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OpeningSequence({ onBegin }) {
  const [textIndex, setTextIndex] = useState(0);
  const [readyToBegin, setReadyToBegin] = useState(false);

  const texts = [
    'Every expert was once a beginner.',
    'Every friendship starts with curiosity.',
    'In a Deep Ocean of Skills.'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTextIndex(prev => {
        if (prev < texts.length - 1) return prev + 1;
        setReadyToBegin(true);
        clearInterval(timer);
        return prev;
      });
    }, 2800);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      onClick={readyToBegin ? onBegin : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#030712',
        zIndex: 20000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justify: 'center',
        cursor: readyToBegin ? 'pointer' : 'default',
        color: '#FFF',
        userSelect: 'none'
      }}
    >
      {/* Central Pulsing Particle */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 1, 0.6],
          boxShadow: [
            '0 0 20px rgba(6, 182, 212, 0.4)',
            '0 0 45px rgba(6, 182, 212, 0.9)',
            '0 0 20px rgba(6, 182, 212, 0.4)'
          ]
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#06B6D4',
          marginBottom: '3rem'
        }}
      />

      {/* Poetic Text Sequence */}
      <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 1.5rem' }}>
        <AnimatePresence mode="wait">
          <motion.h2
            key={textIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.8 }}
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: 0,
              background: 'linear-gradient(135deg, #FFFFFF, #93C5FD)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {texts[textIndex]}
          </motion.h2>
        </AnimatePresence>
      </div>

      {/* Click to Begin Indicator */}
      {readyToBegin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
          style={{
            position: 'absolute',
            bottom: '4rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#38BDF8',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '0.5rem 1.25rem',
            borderRadius: '50px',
            background: 'rgba(6, 182, 212, 0.08)',
            backdropFilter: 'blur(10px)'
          }}
        >
          ✦ Click anywhere to begin
        </motion.div>
      )}
    </div>
  );
}
