import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code, Cpu, Palette, Camera, ShieldCheck, Zap, Sparkles, MessageSquare, Video } from 'lucide-react';

const CINEMATIC_NOTES = [
  {
    id: 'note-1',
    title: 'React & WebRTC',
    subtitle: 'Direct P2P Encrypted Stream',
    author: '@founder',
    bg: '#FEF08A', // Warm Yellow
    border: '#2A2723',
    depth: 1.2, // Foreground
    initialPos: { x: -340, y: -30, rotateX: 6, rotateY: -12, rotateZ: -5 },
    icon: Code,
    tapeColor: 'rgba(214, 91, 62, 0.4)'
  },
  {
    id: 'note-2',
    title: 'AI & Python',
    subtitle: 'Neural Peer Matching',
    author: '@alice',
    bg: '#BBF7D0', // Soft Sage
    border: '#2A2723',
    depth: 1.1,
    initialPos: { x: 340, y: -50, rotateX: -8, rotateY: 10, rotateZ: 6 },
    icon: Cpu,
    tapeColor: 'rgba(74, 110, 83, 0.4)'
  },
  {
    id: 'note-3',
    title: 'UI/UX Design',
    subtitle: 'Tactile Editorial Craft',
    author: '@carol',
    bg: '#FECDD3', // Coral Pink
    border: '#2A2723',
    depth: 0.9, // Midground
    initialPos: { x: -290, y: 160, rotateX: 10, rotateY: 8, rotateZ: -4 },
    icon: Palette,
    tapeColor: 'rgba(229, 169, 60, 0.4)'
  },
  {
    id: 'note-4',
    title: 'Anti-Capture Shield',
    subtitle: 'Zero-Trust Obfuscation',
    author: 'System Security',
    bg: '#BAE6FD', // Sky Blue
    border: '#2A2723',
    depth: 1.15,
    initialPos: { x: 310, y: 140, rotateX: -6, rotateY: -10, rotateZ: 4 },
    icon: ShieldCheck,
    tapeColor: 'rgba(76, 119, 159, 0.4)'
  },
  {
    id: 'note-5',
    title: 'Photography & Sync',
    subtitle: '720p HD Low Latency',
    author: '@david',
    bg: '#FDE68A', // Warm Gold
    border: '#2A2723',
    depth: 1.0,
    initialPos: { x: 0, y: 230, rotateX: 4, rotateY: -4, rotateZ: -2 },
    icon: Camera,
    tapeColor: 'rgba(42, 39, 35, 0.3)'
  }
];

export default function CinematicStickyScene() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '420px',
        margin: '1.5rem 0',
        perspective: '1200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible'
      }}
    >
      {/* 3D Cinematic Parallax Container */}
      <motion.div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 12}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {CINEMATIC_NOTES.map((note) => {
          const Icon = note.icon;
          const parallaxX = note.initialPos.x + mousePos.x * 25 * note.depth;
          const parallaxY = note.initialPos.y + mousePos.y * 25 * note.depth;

          return (
            <motion.div
              key={note.id}
              drag
              dragConstraints={{ left: -500, right: 500, top: -200, bottom: 300 }}
              dragElastic={0.2}
              whileDrag={{ scale: 1.12, rotateX: 0, rotateY: 0, zIndex: 200 }}
              whileHover={{ scale: 1.06, cursor: 'grab' }}
              whileTap={{ cursor: 'grabbing' }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: parallaxX,
                y: [parallaxY, parallaxY - 10, parallaxY],
                rotateX: note.initialPos.rotateX,
                rotateY: note.initialPos.rotateY,
                rotateZ: note.initialPos.rotateZ
              }}
              transition={{
                y: { duration: 4 + note.depth * 0.8, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 0.6 }
              }}
              style={{
                position: 'absolute',
                width: '200px',
                padding: '1.25rem 1.1rem',
                background: note.bg,
                border: `2.5px solid ${note.border}`,
                borderRadius: '14px',
                boxShadow: `${8 * note.depth}px ${8 * note.depth}px 0px 0px #2A2723`,
                color: '#2A2723',
                fontFamily: 'var(--font-mono)',
                userSelect: 'none',
                transformStyle: 'preserve-3d',
                zIndex: Math.round(note.depth * 10)
              }}
            >
              {/* Washi Tape Strip at Top */}
              <div
                style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%) rotate(-1deg)',
                  width: '55px',
                  height: '18px',
                  background: note.tapeColor,
                  backdropFilter: 'blur(2px)',
                  border: '1px solid rgba(42, 39, 35, 0.2)',
                  boxShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', paddingTop: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#6B655C', letterSpacing: '0.5px' }}>
                  {note.subtitle}
                </span>
                <Icon size={16} color="#2A2723" />
              </div>

              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1.25 }}>
                {note.title}
              </h4>

              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D45B3E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                <span>{note.author}</span>
                <span style={{ fontSize: '0.62rem', color: '#6B655C', fontWeight: 700 }}>✦ Drag</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
