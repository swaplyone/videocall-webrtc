import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle, ArrowRight } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export default function PaperRegistrationModal({ isOpen, onClose }) {
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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(42, 39, 35, 0.65)', backdropFilter: 'blur(6px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          style={{
            background: '#FFF',
            border: '2.5px solid #2A2723',
            boxShadow: '12px 12px 0px 0px #2A2723',
            borderRadius: '24px',
            padding: '2.25rem',
            maxWidth: '500px',
            width: '100%',
            color: '#2A2723',
            position: 'relative'
          }}
        >
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#FAF6EE', border: '2px solid #2A2723', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} color="#2A2723" />
          </button>

          {submittedData ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F1F6F1', border: '2.5px solid #4A6E53', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                <CheckCircle size={32} color="#4A6E53" />
              </div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-display)' }}>
                Welcome to SwaplyOne Beta!
              </h3>
              <p style={{ color: '#6B655C', margin: '0.5rem 0 1.5rem 0', fontSize: '0.95rem' }}>
                Your account is active. Beta ID: <strong style={{ color: '#D45B3E', fontFamily: 'var(--font-mono)' }}>{submittedData.user?.beta_id}</strong>
              </p>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/login';
                }}
                style={{
                  padding: '0.8rem 1.75rem',
                  borderRadius: '50px',
                  background: '#D45B3E',
                  border: '2.5px solid #2A2723',
                  boxShadow: '4px 4px 0px 0px #2A2723',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Proceed to Sign In &rarr;
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#D45B3E', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
                  <Sparkles size={16} /> Exclusive Access
                </div>
                <h3 style={{ margin: '0.25rem 0 0 0', fontWeight: 800, fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>
                  Join Beta Waitlist
                </h3>
              </div>

              {error && (
                <div style={{ background: '#FDF2F2', border: '2px solid #BE4D4D', color: '#BE4D4D', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold' }}>
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
                  style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723', color: '#2A2723', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
                />
                <input
                  required
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723', color: '#2A2723', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
                />
              </div>

              <input
                required
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723', color: '#2A2723', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
              />

              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723', color: '#2A2723', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
              />

              <input
                type="text"
                placeholder="Primary Skills (e.g. React, Python, UI Design)"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', background: '#FAF6EE', border: '2px solid #2A2723', color: '#2A2723', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.85rem',
                  borderRadius: '50px',
                  background: '#D45B3E',
                  border: '2.5px solid #2A2723',
                  boxShadow: '4px 4px 0px 0px #2A2723',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {loading ? 'Processing...' : 'Complete Registration'} <ArrowRight size={18} />
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
