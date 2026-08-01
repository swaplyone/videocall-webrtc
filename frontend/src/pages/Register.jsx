import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Key, User, Mail, AlertCircle } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';

export default function Register({ onSecureRegister, loginError }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password) return;
    onSecureRegister({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      password
    });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem', border: '4px solid #111827', boxShadow: '8px 8px 0px #111827' }}>
        
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0.5rem 0 0 0' }}>Register</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Create Swaply Tester Account</p>
        </div>

        {loginError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label htmlFor="reg-name" style={{ fontWeight: 'bold' }}>Full Name</label>
            <input
              id="reg-name"
              type="text"
              placeholder="e.g. Alice Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-username" style={{ fontWeight: 'bold' }}>Username</label>
            <input
              id="reg-username"
              type="text"
              placeholder="e.g. alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email" style={{ fontWeight: 'bold' }}>Email Address</label>
            <input
              id="reg-email"
              type="email"
              placeholder="e.g. alice@swaply.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="reg-pass" style={{ fontWeight: 'bold' }}>Secure Password</label>
            <input
              id="reg-pass"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
            Register Account
          </button>
          
          <div style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>Login here</Link>
          </div>
        </form>

      </div>
    </div>
  );
}
