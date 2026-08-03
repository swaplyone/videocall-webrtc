import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Play, Video, ShieldCheck, QrCode, Users, Activity, Lock, ChevronDown, CheckCircle, Camera, UserX, UserCheck, RefreshCw, Zap, X } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function LandingPage({ currentUser }) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('connect');
  const [fused, setFused] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [shieldTriggered, setShieldTriggered] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skills, setSkills] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [auditLog, setAuditLog] = useState([
    { id: 1, text: 'P2P_SIGNAL_ENCRYPTED_AES256', time: '21:36:04' },
    { id: 2, text: 'CANVAS_ANTI_CAPTURE_ACTIVE', time: '21:36:05' }
  ]);

  const handleSimulateCapture = () => {
    setShieldTriggered(true);
    setAuditLog(prev => [
      { id: Date.now(), text: 'SCREENSHOT_ATTEMPT_BLOCKED (PrintScreen Detected)', time: new Date().toLocaleTimeString() },
      ...prev
    ]);
    setTimeout(() => setShieldTriggered(false), 3500);
  };

  const handleFuseNodes = () => {
    setFused(true);
    setTimeout(() => setCallActive(true), 400);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, skills })
      });
      if (data && data.user) setSubmittedData(data);
      else setError(data.error || 'Registration failed.');
    } catch (err) {
      setError(err.message || 'Error submitting registration.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { id: 'calls', label: 'HD WebRTC Video', desc: 'Direct peer audio/video streams with STUN/TURN fallback.', icon: Video, color: '#D45B3E', bg: '#FFF0EB' },
    { id: 'privacy', label: 'Anti-Capture Shield', desc: 'Tab-blur masking, canvas obfuscation, and real-time screenshot warnings.', icon: ShieldCheck, color: '#4A6E53', bg: '#F1F6F1' },
    { id: 'qr', label: 'Instant QR Sync', desc: 'One-tap mobile QR invitation scanning and peer verification.', icon: QrCode, color: '#4C779F', bg: '#F0F5FA' },
    { id: 'friends', label: 'Peer Friend Directory', desc: 'Strict invitation-based peer directory & block controls.', icon: Users, color: '#2A2723', bg: '#FAF6EE' },
    { id: 'analytics', label: 'RTCStats Inspector', desc: 'Live ping, bitrate, packet loss, jitter, and codec diagnostics.', icon: Activity, color: '#E5A93C', bg: '#FFFBF0' },
    { id: 'security', label: 'Advanced 2FA Security', desc: 'TOTP Google Authenticator integration & device trust management.', icon: Lock, color: '#BE4D4D', bg: '#FDF2F2' }
  ];

  const faqs = [
    { q: 'How does SwaplyOne protect user privacy during video calls?', a: 'SwaplyOne features zero-trust peer-to-peer WebRTC encryption, tab-blur masking, canvas obfuscation, and active screenshot detection that alerts call participants immediately.' },
    { q: 'How does the Beta Waitlist batch allocation work?', a: 'Users registered on the waitlist are automatically assigned queue positions. Available beta slots (default 150 capacity) are allocated in daily batches with 72-hour invitation claim windows.' },
    { q: 'Can I connect with peers without sharing contact details?', a: 'Yes! Connections are made through skill search or unique Beta IDs (`SWP-XXXXX`) and QR code scanning without ever exposing phone numbers or emails.' }
  ];

  return (
    <div style={{ background: '#FAF6EE', color: '#2A2723', minHeight: '100vh', fontFamily: "var(--font-body), 'Work Sans', sans-serif" }}>
      
      {/* HERO SECTION */}
      <section style={{ paddingTop: '110px', paddingBottom: '70px', maxWidth: '1150px', margin: '0 auto', textAlign: 'center', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '4px 4px 0px 0px #2A2723', padding: '0.45rem 1.25rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '2rem' }}>
          <Sparkles size={16} color="#D45B3E" /> SWAPLYONE BETA PLATFORM v2.5.0
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, fontFamily: "var(--font-display), 'Syne', sans-serif", lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 auto 1.5rem auto', maxWidth: '900px' }}>
          In a Deep Ocean of Skills.
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#6B655C', maxWidth: '640px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
          Connect people through skills, not randomness. Peer-to-Peer Encrypted WebRTC Video Communication & Screenshot Protection.
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <button
            onClick={() => setModalOpen(true)}
            style={{ padding: '0.9rem 2.2rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', boxShadow: '5px 5px 0px 0px #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Become a Beta Tester <ArrowRight size={18} />
          </button>

          <button
            onClick={() => {
              const el = document.getElementById('interactive-demo');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ padding: '0.9rem 2.2rem', borderRadius: '50px', background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '5px 5px 0px 0px #2A2723', color: '#2A2723', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Play size={18} /> Interactive Demo
          </button>
        </div>

        {/* Clean Skill Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
          {['React', 'Python', 'AI & ML', 'UI/UX Design', 'Photography', 'Music Sync', 'Flutter', 'Node.js'].map((skill, idx) => (
            <div key={idx} style={{ background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '4px 4px 0px 0px #2A2723', padding: '0.5rem 1.1rem', borderRadius: '50px', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              {skill}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS STORY CARDS */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          The Journey
        </span>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 2.5rem 0', fontFamily: 'var(--font-display)' }}>
          How SwaplyOne Works
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {[
            { step: '01', title: 'Discover Skills', desc: 'Browse peer profiles by expertise' },
            { step: '02', title: 'Connect', desc: 'Send invitation or scan QR token' },
            { step: '03', title: 'Become Friends', desc: 'Establish trusted peer friend status' },
            { step: '04', title: 'Video Call', desc: 'Launch P2P WebRTC HD stream' }
          ].map(item => (
            <div key={item.step} style={{ background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '16px', padding: '1.5rem', boxShadow: '5px 5px 0px 0px #2A2723', textAlign: 'left' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D45B3E', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '0.4rem' }}>{item.step}</span>
              <h3 style={{ margin: '0 0 0.3rem 0', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B655C', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INTERACTIVE DEMO PLAYGROUND */}
      <section id="interactive-demo" style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Interactive Demo
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
            Peer Skill Connection Sandbox
          </h2>
          <p style={{ color: '#6B655C', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            Click button below to fuse peer skill badges and establish direct WebRTC encrypted video stream.
          </p>
        </div>

        <div style={{ maxWidth: '680px', margin: '0 auto', background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '20px', padding: '2.5rem 1.5rem', boxShadow: '8px 8px 0px 0px #2A2723', textAlign: 'center' }}>
          {callActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: '#4A6E53', border: '2.5px solid #2A2723', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 0px 0px #2A2723' }}>
                <Video size={36} color="#FFF" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--font-display)' }}>P2P WebRTC Video Session Active</h3>
                <span style={{ fontSize: '0.85rem', color: '#4A6E53', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>🟢 Direct Peer Stream (@founder &bull; @alice)</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', background: '#FAF6EE', border: '2px solid #2A2723', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <span>Latency: 18ms</span> &bull; <span>Resolution: 720p HD</span> &bull; <span>Codec: VP8</span>
              </div>
              <button onClick={() => { setFused(false); setCallActive(false); }} style={{ padding: '0.5rem 1.25rem', borderRadius: '30px', background: '#FAF6EE', border: '2px solid #2A2723', color: '#2A2723', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                Reset Stage
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
              <div style={{ display: 'flex', gap: fused ? '10px' : '4rem', transition: 'gap 0.4s ease' }}>
                <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: '#FFF0EB', border: '2.5px solid #D45B3E', boxShadow: '4px 4px 0px 0px #2A2723', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#D45B3E', fontFamily: 'var(--font-mono)' }}>
                  <span>React</span>
                  <span style={{ fontSize: '0.7rem', color: '#2A2723' }}>@founder</span>
                </div>
                <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: '#F1F6F1', border: '2.5px solid #4A6E53', boxShadow: '4px 4px 0px 0px #2A2723', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#4A6E53', fontFamily: 'var(--font-mono)' }}>
                  <span>AI & ML</span>
                  <span style={{ fontSize: '0.7rem', color: '#2A2723' }}>@alice</span>
                </div>
              </div>
              <button onClick={handleFuseNodes} style={{ padding: '0.85rem 2.2rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', boxShadow: '4px 4px 0px 0px #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={18} /> Connect Skill Badges & Call
              </button>
            </div>
          )}
        </div>
      </section>

      {/* PLATFORM FEATURES GRID */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Ecosystem Features
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
            Platform Architecture
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} onClick={() => setSelectedFeature(item)} style={{ background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '16px', padding: '1.5rem', boxShadow: '5px 5px 0px 0px #2A2723', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: item.bg, border: `2px solid ${item.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '3px 3px 0px 0px #2A2723' }}>
                  <Icon size={24} color={item.color} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.3rem 0', fontWeight: 800, fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>{item.label}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B655C', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ANTI-CAPTURE PRIVACY SIMULATOR */}
      <section style={{ padding: '4rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4A6E53', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Privacy Engine
          </span>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0.4rem 0 0.6rem 0', fontFamily: 'var(--font-display)' }}>
            Anti-Capture Screen Guard
          </h2>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', background: '#FFF', border: '2.5px solid #2A2723', borderRadius: '20px', overflow: 'hidden', boxShadow: '8px 8px 0px 0px #2A2723' }}>
          <div style={{ background: '#FAF6EE', padding: '0.8rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #2A2723' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="#4A6E53" />
              <strong style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>Swaply Anti-Capture Guard</strong>
            </div>
            <button onClick={handleSimulateCapture} style={{ padding: '0.45rem 1rem', borderRadius: '30px', background: '#D45B3E', border: '2px solid #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', boxShadow: '3px 3px 0px 0px #2A2723' }}>
              <Camera size={14} /> Simulate PrintScreen
            </button>
          </div>

          <div style={{ position: 'relative', height: '260px', background: '#F4EFE6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {shieldTriggered ? (
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
              {auditLog.slice(0, 3).map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', color: log.text.includes('BLOCKED') ? '#BE4D4D' : '#2A2723' }}>
                  <span>&bull; {log.text}</span>
                  <span>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS & MARQUEE */}
      <section style={{ padding: '4rem 1.5rem', background: '#FFF', borderTop: '2.5px solid #2A2723', borderBottom: '2.5px solid #2A2723' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#D45B3E', fontFamily: 'var(--font-display)' }}>150+</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Registered Beta Users</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4A6E53', fontFamily: 'var(--font-display)' }}>100%</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>P2P Encrypted WebRTC</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4C779F', fontFamily: 'var(--font-display)' }}>99.9%</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Email Deliverability</div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#E5A93C', fontFamily: 'var(--font-display)' }}>0s</div>
            <div style={{ fontSize: '0.85rem', color: '#6B655C', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>Server Media Storage</div>
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
              <button onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)} style={{ width: '100%', padding: '1.25rem', background: 'none', border: 'none', color: '#2A2723', fontWeight: 800, fontSize: '1rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <span>{faq.q}</span>
                <ChevronDown size={20} style={{ transform: openFaqIndex === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </button>
              {openFaqIndex === idx && (
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
        <button onClick={() => setModalOpen(true)} style={{ padding: '0.95rem 2.4rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', boxShadow: '5px 5px 0px 0px #2A2723', color: '#FFF', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>
          Become a Beta Tester &rarr;
        </button>
        <div style={{ marginTop: '3.5rem', color: '#6B655C', fontSize: '0.85rem', borderTop: '2px solid #EADFCF', paddingTop: '1.5rem', fontFamily: 'var(--font-mono)' }}>
          &copy; 2026 SwaplyOne Inc. "In a Deep Ocean of Skills." &bull; All Rights Reserved.
        </div>
      </footer>

      {/* BETA REGISTRATION MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(42, 39, 35, 0.65)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFF', border: '2.5px solid #2A2723', boxShadow: '10px 10px 0px 0px #2A2723', borderRadius: '24px', padding: '2rem', maxWidth: '480px', width: '100%', color: '#2A2723', position: 'relative' }}>
            <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#FAF6EE', border: '2px solid #2A2723', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} color="#2A2723" />
            </button>

            {submittedData ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle size={44} color="#4A6E53" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>Welcome to SwaplyOne Beta!</h3>
                <p style={{ color: '#6B655C', margin: '0.5rem 0 1.5rem 0', fontSize: '0.95rem' }}>Beta ID: <strong style={{ color: '#D45B3E', fontFamily: 'var(--font-mono)' }}>{submittedData.user?.beta_id}</strong></p>
                <button onClick={() => { setModalOpen(false); window.location.href = '/login'; }} style={{ padding: '0.8rem 1.75rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', color: '#FFF', fontWeight: 800 }}>Proceed to Sign In &rarr;</button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#D45B3E', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>✦ Exclusive Beta Access</span>
                  <h3 style={{ margin: '0.2rem 0 0 0', fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>Join Beta Waitlist</h3>
                </div>
                {error && <div style={{ background: '#FDF2F2', border: '2px solid #BE4D4D', color: '#BE4D4D', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>{error}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input required type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} style={{ padding: '0.7rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723' }} />
                  <input required type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ padding: '0.7rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723' }} />
                </div>
                <input required type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '0.7rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723' }} />
                <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '0.7rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723' }} />
                <input type="text" placeholder="Skills (e.g. React, Python)" value={skills} onChange={e => setSkills(e.target.value)} style={{ padding: '0.7rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723' }} />
                <button type="submit" disabled={loading} style={{ padding: '0.85rem', borderRadius: '50px', background: '#D45B3E', border: '2.5px solid #2A2723', boxShadow: '4px 4px 0px 0px #2A2723', color: '#FFF', fontWeight: 800, marginTop: '0.5rem', cursor: 'pointer' }}>
                  {loading ? 'Processing...' : 'Complete Registration'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
