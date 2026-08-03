import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle, ArrowRight, Lock } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export default function VortexRegistrationModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skills, setSkills] = useState('');
  const [submittedData, setSubmittedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, skills })
      });

      if (data && data.user) {
        setSubmittedData(data);
      } else {
        setError(data.error || 'Registration failed. Please check inputs.');
      }
    } catch (err) {
      setError(err.message || 'Error submitting registration.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 8, 22, 0.9)', backdropFilter: 'blur(16px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          style={{
            background: '#0F172A',
            border: '2px solid rgba(6, 182, 212, 0.4)',
            boxShadow: '0 0 50px rgba(6, 182, 212, 0.3)',
            borderRadius: '28px',
            padding: '2.25rem',
            maxWidth: '520px',
            width: '100%',
            color: '#FFF',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94A3B8', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>

          {submittedData ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <CheckCircle size={36} color="#10B981" />
              </div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase' }}>
                Welcome to SwaplyOne Beta!
              </h3>
              <p style={{ color: '#94A3B8', margin: '0.5rem 0 1.5rem 0', fontSize: '0.95rem' }}>
                Your account is active. Beta ID: <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>{submittedData.user?.beta_id}</strong>
              </p>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/login';
                }}
                style={{
                  padding: '0.8rem 1.75rem',
                  borderRadius: '50px',
                  background: 'linear-gradient(135deg, #2563EB, #4F46E5)',
                  border: 'none',
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                Proceed to Sign In &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#06B6D4', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <Sparkles size={16} /> Exclusive Access
                </div>
                <h3 style={{ margin: '0.25rem 0 0 0', fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase' }}>
                  Join Beta Waitlist
                </h3>
              </div>

              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input
                  required
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '0.85rem' }}
                />
                <input
                  required
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '0.85rem' }}
                />
              </div>

              <input
                required
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '0.85rem' }}
              />

              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '0.85rem' }}
              />

              <input
                type="text"
                placeholder="Primary Skills (e.g. React, Python, UI Design)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '0.85rem' }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.85rem',
                  borderRadius: '50px',
                  background: 'linear-gradient(135deg, #06B6D4, #2563EB)',
                  border: 'none',
                  color: '#FFF',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Processing Registration...' : 'Complete Registration'} <ArrowRight size={18} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
