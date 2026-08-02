import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Key, User, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';
import BrandThreadsIcon from '../components/BrandThreadsIcon';
import AnimatedInput from '../components/AnimatedInput';

export default function Register({ onSecureRegister, loginError }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
        
        {/* Centered Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', margin: '0.5rem 0 0 0', textAlign: 'center' }}>Register</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', textAlign: 'center' }}>Create Swaply Tester Account</p>
        </div>

        {loginError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label htmlFor="reg-name" style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>Full Name</label>
            <AnimatedInput
              id="reg-name"
              type="text"
              placeholderExamples={["e.g. Alice Smith", "e.g. Bob Johnson", "e.g. Charlie Brown"]}
              placeholder="e.g. Alice Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-username" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <BrandThreadsIcon size={18} color="var(--color-primary)" />
              <span>Username</span>
            </label>
            <AnimatedInput
              id="reg-username"
              type="text"
              placeholderExamples={["e.g. alice", "e.g. tester_bob", "e.g. swaply_node"]}
              placeholder="e.g. alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <BrandThreadsIcon size={18} color="var(--color-primary)" />
              <span>Email Address</span>
            </label>
            <AnimatedInput
              id="reg-email"
              type="email"
              placeholderExamples={["e.g. alice@swaply.app", "e.g. user@gmail.com", "e.g. tester@swaply.app"]}
              placeholder="e.g. alice@swaply.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="reg-pass" style={{ fontWeight: 'bold', marginBottom: '0.4rem' }}>Secure Password</label>
            <AnimatedInput
              id="reg-pass"
              type={showPassword ? 'text' : 'password'}
              placeholderExamples={["••••••••", "choose strong password..."]}
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
