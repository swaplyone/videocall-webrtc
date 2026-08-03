import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Video, ShieldCheck, QrCode, Users, Activity, Lock, ChevronDown, CheckCircle, Camera, Volume2, VolumeX, Search, MessageSquare, Mic, MicOff, PhoneOff, Monitor } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export default function HighEnergyPaperStudio({ onOpenWaitlist }) {
  const [soundOn, setSoundOn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCallDemo, setActiveCallDemo] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);

  const [auditLogs, setAuditLogs] = useState([
    { id: 1, text: 'P2P_SIGNAL_ENCRYPTED_AES256', time: '21:42:01' },
    { id: 2, text: 'CANVAS_ANTI_CAPTURE_ACTIVE', time: '21:42:02' }
  ]);

  // Audio chime helper
  const playSound = (freq = 440) => {
    if (!soundOn) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSimulateScreenshot = () => {
    playSound(600);
    setShieldActive(true);
    setAuditLogs(prev => [
      { id: Date.now(), text: 'SCREENSHOT_ATTEMPT_BLOCKED (PrintScreen Detected)', time: new Date().toLocaleTimeString() },
      ...prev
    ]);
    setTimeout(() => setShieldActive(false), 3800);
  };

  const samplePeers = [
    { name: 'Alice Smith', handle: '@alice', skill: 'React & WebRTC', color: '#D45B3E', bg: '#FFF0EB' },
    { name: 'Bob Chen', handle: '@bob', skill: 'AI & Python', color: '#4A6E53', bg: '#F1F6F1' },
    { name: 'Carol Vance', handle: '@carol', skill: 'UI/UX Design', color: '#4C779F', bg: '#F0F5FA' },
    { name: 'David Miller', handle: '@david', skill: 'Cybersecurity', color: '#E5A93C', bg: '#FFFBF0' }
  ];

  const filteredPeers = samplePeers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ background: '#FAF6EE', color: '#2A2723', minHeight: '100vh', fontFamily: "var(--font-body), 'Work Sans', sans-serif" }}>
      
      {/* Sound Toggle Floating Badge */}
      <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 1000 }}>
        <button
          onClick={() => { setSoundOn(!soundOn); playSound(520); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 1rem',
            background: soundOn ? '#D45B3E' : '#FFF',
            border: '2.5px solid #2A2723',
            boxShadow: '4px 4px 0px 0px #2A2723',
            borderRadius: '50px',
            color: soundOn ? '#FFF' : '#2A2723',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundOn ? 'SOUND ON' : 'ENABLE SOUND'}</span>
        </button>
      </div>

      {/* HERO SECTION */}
      <section style={{ paddingTop: '110px', paddingBottom: '60px', maxWidth: '1150px', margin: '0 auto', textAlign: 'center', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '4px 4px 0px 0px #2A2723', padding: '0.45rem 1.25rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '2rem' }}
        >
          <Sparkles size={16} color="#D45B3E" /> SWAPLYONE PLATFORM v2.5.0
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.6rem)', fontWeight: 800, fontFamily: "var(--font-display), 'Syne', sans-serif", lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 1.5rem auto', maxWidth: '920px' }}
        >
          In a Deep Ocean of Skills.
        </motion.h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#6B655C', maxWidth: '640px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
          Connect people through skills, not randomness. Peer-to-Peer Encrypted WebRTC Video Communication & Screenshot Protection.
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <button
            onClick={() => { playSound(500); if (typeof onOpenWaitlist === 'function') onOpenWaitlist(); }}
            style={{ padding: '0.95rem 2.4rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', boxShadow: '6px 6px 0px 0px #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Become a Beta Tester <ArrowRight size={18} />
          </button>

          <button
            onClick={() => {
              playSound(420);
              const el = document.getElementById('peer-search');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ padding: '0.95rem 2.4rem', borderRadius: '50px', background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '6px 6px 0px 0px #2A2723', color: '#2A2723', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={18} /> Try Peer Search
          </button>
        </div>

        {/* HIGH-ENERGY DRAGGABLE STICKY NOTES BOARD */}
        <div style={{ position: 'relative', width: '100%', minHeight: '260px', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          {[
            { title: '📌 React & WebRTC', author: '@founder', bg: '#FEF08A', rotate: -3 },
            { title: '💡 AI & Python', author: '@alice', bg: '#BBF7D0', rotate: 4 },
            { title: '🎨 UI/UX Design', author: '@carol', bg: '#FECDD3', rotate: -4 },
            { title: '🔒 Anti-Capture Guard', author: 'System', bg: '#BAE6FD', rotate: 3 },
            { title: '📷 Photography', author: '@david', bg: '#FDE68A', rotate: -2 }
          ].map((note, idx) => (
            <motion.div
              key={idx}
              drag
              dragConstraints={{ left: -120, right: 120, top: -60, bottom: 60 }}
              whileDrag={{ scale: 1.08, rotate: 0, zIndex: 100 }}
              whileHover={{ scale: 1.04, cursor: 'grab' }}
              animate={{ rotate: note.rotate }}
              onDragStart={() => playSound(380)}
              style={{
                width: '180px',
                padding: '1rem',
                background: note.bg,
                border: '2.5px solid #2A2723',
                borderRadius: '14px',
                boxShadow: '6px 6px 0px 0px #2A2723',
                textAlign: 'left',
                userSelect: 'none'
              }}
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6B655C', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>PEER STICKER</span>
              <h4 style={{ margin: '0.2rem 0 0.4rem 0', fontWeight: 800, fontSize: '0.95rem', fontFamily: 'var(--font-display)' }}>{note.title}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#D45B3E', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                <span>{note.author}</span>
                <span style={{ color: '#6B655C' }}>✦ Drag</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DYNAMIC PEER SEARCH & DISCOVERY ENGINE */}
      <section id="peer-search" style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Live Discovery Engine
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
            Search & Connect Peers by Skill
          </h2>
          <p style={{ color: '#6B655C', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Type any skill name below to filter active community members and launch a video session.
          </p>
        </div>

        {/* Search Input Bar */}
        <div style={{ maxWidth: '600px', margin: '0 auto 2.5rem auto', position: 'relative' }}>
          <Search size={22} color="#2A2723" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search skills (e.g. React, Python, UI/UX, Cybersecurity)..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); playSound(340); }}
            style={{
              width: '100%',
              padding: '1rem 1rem 1rem 3.25rem',
              borderRadius: '50px',
              background: '#FFF',
              border: '2.5px solid #2A2723',
              boxShadow: '6px 6px 0px 0px #2A2723',
              fontSize: '1rem',
              fontWeight: 700,
              color: '#2A2723',
              outline: 'none',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>

        {/* Peer Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {filteredPeers.map((peer, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.03 }}
              style={{
                background: '#FFF',
                border: '2.5px solid #2A2723',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '6px 6px 0px 0px #2A2723',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: peer.bg, border: `2.5px solid ${peer.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: peer.color }}>
                  {peer.name[0]}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>{peer.name}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#D45B3E', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{peer.handle}</span>
                </div>
              </div>

              <div style={{ background: '#FAF6EE', border: '2px solid #2A2723', padding: '0.5rem 0.8rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                Skill: <strong>{peer.skill}</strong>
              </div>

              <button
                onClick={() => { playSound(480); setActiveCallDemo(true); }}
                style={{
                  padding: '0.65rem',
                  borderRadius: '50px',
                  background: peer.color,
                  border: '2px solid #2A2723',
                  boxShadow: '3px 3px 0px 0px #2A2723',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Video size={16} /> Launch Video Call
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* LIVE WEBRTC VIDEO CALL STUDIO DEMO */}
      <AnimatePresence>
        {activeCallDemo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(42, 39, 35, 0.75)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          >
            <div style={{ background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '12px 12px 0px 0px #2A2723', borderRadius: '24px', padding: '2rem', maxWidth: '640px', width: '100%', position: 'relative' }}>
              <button
                onClick={() => { playSound(300); setActiveCallDemo(false); }}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#FAF6EE', border: '2px solid #2A2723', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} color="#2A2723" />
              </button>

              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4A6E53', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  🟢 Direct P2P Encrypted Session
                </span>
                <h3 style={{ margin: '0.2rem 0 0 0', fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>
                  WebRTC Call Studio (@founder &bull; @alice)
                </h3>
              </div>

              {/* Video Monitor Box */}
              <div style={{ height: '240px', background: camOff ? '#2A2723' : '#F4EFE6', border: '2.5px solid #2A2723', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {camOff ? (
                  <div style={{ color: '#FFF', textAlign: 'center' }}>
                    <Camera size={44} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                    <div style={{ fontWeight: 800 }}>Camera Muted</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#D45B3E', border: '2.5px solid #2A2723', color: '#FFF', fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto' }}>
                      A
                    </div>
                    <h4 style={{ margin: 0, fontWeight: 800 }}>Alice Smith (720p HD)</h4>
                    <span style={{ fontSize: '0.78rem', color: '#4A6E53', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>Ping: 18ms &bull; Bitrate: 1850kbps &bull; FPS: 30</span>
                  </div>
                )}
              </div>

              {/* Interactive Control Dock */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
                <button onClick={() => { setMicMuted(!micMuted); playSound(400); }} style={{ width: '46px', height: '46px', borderRadius: '50%', background: micMuted ? '#BE4D4D' : '#FAF6EE', border: '2px solid #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: micMuted ? '#FFF' : '#2A2723' }}>
                  {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button onClick={() => { setCamOff(!camOff); playSound(400); }} style={{ width: '46px', height: '46px', borderRadius: '50%', background: camOff ? '#BE4D4D' : '#FAF6EE', border: '2px solid #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: camOff ? '#FFF' : '#2A2723' }}>
                  <Camera size={20} />
                </button>
                <button onClick={() => { setScreenSharing(!screenSharing); playSound(400); }} style={{ width: '46px', height: '46px', borderRadius: '50%', background: screenSharing ? '#4A6E53' : '#FAF6EE', border: '2px solid #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: screenSharing ? '#FFF' : '#2A2723' }}>
                  <Monitor size={20} />
                </button>
                <button onClick={() => { playSound(300); setActiveCallDemo(false); }} style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#BE4D4D', border: '2px solid #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFF' }}>
                  <PhoneOff size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ANTI-CAPTURE SCREENSHOT SIMULATOR */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4A6E53', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Privacy Guard
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
            Anti-Capture Screenshot Guard
          </h2>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '20px', overflow: 'hidden', boxShadow: '8px 8px 0px 0px #2A2723' }}>
          <div style={{ background: '#FAF6EE', padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #2A2723' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#4A6E53" />
              <strong style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>Swaply Anti-Capture Guard</strong>
            </div>
            <button onClick={handleSimulateScreenshot} style={{ padding: '0.45rem 1rem', borderRadius: '30px', background: '#D45B3E', border: '2px solid #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', boxShadow: '3px 3px 0px 0px #2A2723' }}>
              <Camera size={14} /> Simulate PrintScreen
            </button>
          </div>

          <div style={{ position: 'relative', height: '250px', background: '#F4EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {shieldActive ? (
              <div style={{ position: 'absolute', inset: 0, background: '#BE4D4D', color: '#FFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-display)' }}>SCREENSHOT ATTEMPT DETECTED</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '420px', color: '#FEE2E2' }}>Video stream obfuscated. Security warning logged to audit stream.</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#2A2723' }}>
                <Lock size={44} color="#4A6E53" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>P2P Encrypted Session Protected</h4>
                <span style={{ fontSize: '0.8rem', color: '#4A6E53', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>🟢 Anti-Capture Guard Active</span>
              </div>
            )}
          </div>

          <div style={{ background: '#FAF6EE', padding: '1rem 1.25rem', borderTop: '2.5px solid #2A2723' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Security Audit Stream
            </span>
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
              {auditLogs.slice(0, 3).map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', color: log.text.includes('BLOCKED') ? '#BE4D4D' : '#2A2723' }}>
                  <span>&bull; {log.text}</span>
                  <span>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
            Frequently Asked Questions
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '16px', boxShadow: '4px 4px 0px 0px #2A2723', overflow: 'hidden' }}>
              <button onClick={() => setFaqOpen(faqOpen === idx ? null : idx)} style={{ width: '100%', padding: '1.25rem', background: 'none', border: 'none', color: '#2A2723', fontWeight: 800, fontSize: '1rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>{faq.q}</span>
                <ChevronDown size={20} style={{ transform: faqOpen === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>
              {faqOpen === idx && (
                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#6B655C', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '4.5rem 1.5rem', textAlign: 'center', background: '#FFF', borderTop: '2.5px solid #2A2723' }}>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
          Ready to Join SwaplyOne?
        </h2>
        <p style={{ color: '#6B655C', fontSize: '1.05rem', maxWidth: '540px', margin: '0 auto 2.25rem auto' }}>
          Reserve your spot in our daily rollout batch and experience privacy-first skill communication.
        </p>
        <button onClick={() => { playSound(500); if (typeof onOpenWaitlist === 'function') onOpenWaitlist(); }} style={{ padding: '0.95rem 2.4rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', boxShadow: '5px 5px 0px 0px #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>
          Become a Beta Tester &rarr;
        </button>
        <div style={{ marginTop: '3.5rem', color: '#6B655C', fontSize: '0.85rem', borderTop: '2px solid #EADFCF', paddingTop: '1.5rem', fontFamily: 'var(--font-mono)' }}>
          &copy; 2026 SwaplyOne Inc. "In a Deep Ocean of Skills." &bull; All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
