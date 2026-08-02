import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Key, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';
import BrandThreadsIcon from '../components/BrandThreadsIcon';
import AnimatedInput from '../components/AnimatedInput';

export default function Login({ onLogin, onSecureLogin, loginError }) {
  const [loginMode, setLoginMode] = useState('secure'); // 'secure' or 'anonymous'
  
  // Secure credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
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
        
        {/* Centered Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0.5rem 0 0 0', textAlign: 'center' }}>Swaply</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', textAlign: 'center' }}>Standalone Video Calling Beta</p>
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
              <label htmlFor="login-username" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <BrandThreadsIcon size={18} color="var(--color-primary)" />
                <span>Username or Email</span>
              </label>
              <AnimatedInput
                id="login-username"
                type="text"
                placeholderExamples={["e.g. alice", "e.g. founder@swaplyone.in", "e.g. bob@swaply.app"]}
                placeholder="e.g. alice or alice@swaply.app"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="login-pass" style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>Secure Password</label>
              <AnimatedInput
                id="login-pass"
                type={showPassword ? 'text' : 'password'}
                placeholderExamples={["••••••••", "enter secure password...", "lichisw@26"]}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              Enter Console
            </button>
            
            <div style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '0.75rem' }}>
              Don't have an account? <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline' }}>Register here</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAnonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label htmlFor="anon-user" style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>Guest Screen Name</label>
              <AnimatedInput
                id="anon-user"
                type="text"
                placeholderExamples={["e.g. Guest-Tester", "e.g. DialNode-42", "e.g. SwaplyUser"]}
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
