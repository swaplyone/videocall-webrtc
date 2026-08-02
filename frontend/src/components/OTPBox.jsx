import React from 'react';
import { motion } from 'motion/react';

export default function OTPBox({
  digit = '',
  isActive = false,
  isLocked = false,
  onClick,
  index
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isActive ? [1, 1.05, 1] : 1,
      }}
      transition={{
        opacity: { duration: 0.3, delay: index * 0.05 },
        y: { duration: 0.3, delay: index * 0.05 },
        scale: isActive ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }
      }}
      onClick={onClick}
      style={{
        width: '46px',
        height: '56px',
        borderRadius: '10px',
        border: isActive
          ? '3px solid var(--color-primary, #D45B3E)'
          : digit
          ? '3px solid #111827'
          : '2px solid #D1D5DB',
        backgroundColor: isLocked ? '#F3F4F6' : '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        fontWeight: 800,
        fontFamily: 'var(--font-mono, monospace)',
        color: '#111827',
        boxShadow: isActive
          ? '0 0 0 4px rgba(212, 91, 62, 0.25), 3px 3px 0 #111827'
          : digit
          ? '3px 3px 0 #111827'
          : 'inset 0 2px 4px rgba(0,0,0,0.05)',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        position: 'relative',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease'
      }}
    >
      {/* Digit pop animation */}
      {digit ? (
        <motion.span
          key={digit}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        >
          {digit}
        </motion.span>
      ) : (
        isActive && (
          <motion.div
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              width: '2px',
              height: '24px',
              backgroundColor: 'var(--color-primary, #D45B3E)',
              borderRadius: '1px'
            }}
          />
        )
      )}
    </motion.div>
  );
}
