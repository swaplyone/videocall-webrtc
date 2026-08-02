import React from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

export default function LoadingSpinner({ text = 'Verifying...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', gap: '1.25rem' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Outer Rotating Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '4px solid rgba(212, 91, 62, 0.15)',
            borderTopColor: 'var(--color-primary, #D45B3E)',
            borderRightColor: 'var(--color-primary, #D45B3E)',
          }}
        />
        
        {/* Inner Pulsing Shield */}
        <motion.div
          animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ color: 'var(--color-primary, #D45B3E)' }}
        >
          <Shield size={28} />
        </motion.div>
      </div>

      <motion.span
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          fontFamily: 'var(--font-display, sans-serif)',
          fontSize: '1.1rem',
          fontWeight: 800,
          color: 'var(--text-primary, #2A2723)',
          letterSpacing: '0.02em'
        }}
      >
        {text}
      </motion.span>
    </div>
  );
}
