import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Key, User, AlertCircle } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';

export default function Login({ onLogin, onSecureLogin, loginError }) {
  const [loginMode, setLoginMode] = useState('secure'); // 'secure' or 'anonymous'
  
  // Secure credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // Anonymous name
  const [anonName, setAnonName] = useState('');

  const handleSecureSubmit = (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    onSecureLogin({ identifier: identifier.trim(), password });
  };

  const handleAnonSubmit = (e) => {
    e.preventDefault();
    if (!anonName.trim()) return;
    onLogin(anonName.trim());
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2rem', border: '4px solid #111827', boxShadow: '8px 8px 0px #111827' }}>
        
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0.5rem 0 0 0' }}>Swaply</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Standalone Video Calling Beta</p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #111827', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`btn ${loginMode === 'secure' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', fontWeight: 'bold' }}
            onClick={() => setLoginMode('secure')}
          >
            Secure Account
          </button>
          <button
            type="button"
            className={`btn ${loginMode === 'anonymous' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', fontWeight: 'bold' }}
            onClick={() => setLoginMode('anonymous')}
          >
            Quick Guest Dial
          </button>
        </div>

        {loginError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{loginError}</span>
          </div>
        )}

        {loginMode === 'secure' ? (
          <form onSubmit={handleSecureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label htmlFor="login-username" style={{ fontWeight: 'bold' }}>Username or Email</label>
              <input
                id="login-username"
                type="text"
                placeholder="e.g. alice or alice@swaply.app"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="login-pass" style={{ fontWeight: 'bold' }}>Secure Password</label>
              <input
                id="login-pass"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              Verify & Enter Console
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '0.75rem' }}>
              Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>Register here</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAnonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label htmlFor="anon-user" style={{ fontWeight: 'bold' }}>Guest Screen Name</label>
              <input
                id="anon-user"
                type="text"
                placeholder="Enter screen name..."
                value={anonName}
                onChange={(e) => setAnonName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              Connect Anonymous Dialer
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
