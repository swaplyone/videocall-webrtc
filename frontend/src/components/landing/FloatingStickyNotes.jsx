import React from 'react';
import { motion } from 'framer-motion';
import { Pin, Sparkles, Code, Cpu, Palette, Camera, ShieldCheck, Zap } from 'lucide-react';

const STICKY_NOTES = [
  {
    id: 1,
    title: 'React & WebRTC',
    category: 'Skill Node',
    author: '@founder',
    bg: '#FEF08A', // Pastel Yellow
    border: '#2A2723',
    rotate: -4,
    x: -320,
    y: -40,
    icon: Code
  },
  {
    id: 2,
    title: 'AI & Python',
    category: 'Skill Node',
    author: '@alice',
    bg: '#BBF7D0', // Sage Green
    border: '#2A2723',
    rotate: 5,
    x: 320,
    y: -60,
    icon: Cpu
  },
  {
    id: 3,
    title: 'UI/UX Design',
    category: 'Creative Skill',
    author: '@carol',
    bg: '#FECDD3', // Coral Pink
    border: '#2A2723',
    rotate: -6,
    x: -280,
    y: 140,
    icon: Palette
  },
  {
    id: 4,
    title: 'Anti-Capture Shield',
    category: 'Privacy Tech',
    author: 'System',
    bg: '#BAE6FD', // Sky Blue
    border: '#2A2723',
    rotate: 4,
    x: 290,
    y: 120,
    icon: ShieldCheck
  },
  {
    id: 5,
    title: 'Photography & Sync',
    category: 'Skill Node',
    author: '@david',
    bg: '#FDE68A', // Warm Gold
    border: '#2A2723',
    rotate: -3,
    x: 0,
    y: 220,
    icon: Camera
  }
];

export default function FloatingStickyNotes() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0' }}>
      {STICKY_NOTES.map((note) => {
        const Icon = note.icon;
        return (
          <motion.div
            key={note.id}
            drag
            dragConstraints={{ left: -450, right: 450, top: -150, bottom: 250 }}
            dragElastic={0.2}
            whileDrag={{ scale: 1.1, rotate: 0, zIndex: 100 }}
            whileHover={{ scale: 1.06, cursor: 'grab' }}
            whileTap={{ cursor: 'grabbing' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: note.x,
              y: [note.y, note.y - 8, note.y],
              rotate: note.rotate
            }}
            transition={{
              y: { duration: 3.5 + note.id * 0.4, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.5 }
            }}
            style={{
              position: 'absolute',
              width: '180px',
              padding: '1rem',
              background: note.bg,
              border: `2.5px solid ${note.border}`,
              borderRadius: '12px',
              boxShadow: '6px 6px 0px 0px #2A2723',
              color: '#2A2723',
              fontFamily: 'var(--font-mono)',
              userSelect: 'none',
              zIndex: 10
            }}
          >
            {/* Red Push Pin Header */}
            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#D45B3E', border: '2px solid #2A2723', width: '16px', height: '16px', borderRadius: '50%', boxShadow: '2px 2px 0px 0px #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: '4px', height: '4px', background: '#FFF', borderRadius: '50%' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', paddingTop: '0.2rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#6B655C' }}>
                {note.category}
              </span>
              <Icon size={14} color="#2A2723" />
            </div>

            <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.92rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              {note.title}
            </h4>

            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D45B3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{note.author}</span>
              <span style={{ fontSize: '0.6rem', color: '#6B655C' }}>✦ Drag me</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
