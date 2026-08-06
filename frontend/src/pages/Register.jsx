import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Key, User, Mail, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';
import BrandThreadsIcon from '../components/BrandThreadsIcon';
import AnimatedInput from '../components/AnimatedInput';

const NAME_EXAMPLES = ["e.g. Alice Smith", "e.g. Bob Johnson", "e.g. Charlie Brown"];
const USERNAME_EXAMPLES = ["e.g. alice", "e.g. tester_bob", "e.g. swaply_node"];
const EMAIL_EXAMPLES = ["e.g. alice@swaply.app", "e.g. user@gmail.com", "e.g. tester@swaply.app"];
const PASSWORD_EXAMPLES = ["••••••••", "choose strong password..."];

export default function Register({ onSecureRegister, loginError }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states & Inline field error handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password || isSubmitting) return;

    // Reset previous error states
    setUsernameError('');
    setEmailError('');
    setGeneralError('');
    setIsSubmitting(true);

    try {
      await onSecureRegister({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password
      });
    } catch (err) {
      console.warn('[Register] Form registration error:', err);
      setIsSubmitting(false);
      
      const code = err.code || (err.data && err.data.code);
      const msg = err.message || 'Registration failed. Please check your details.';

      if (code === 'USERNAME_EXISTS') {
        setUsernameError('Username already exists.');
      } else if (code === 'EMAIL_EXISTS') {
        setEmailError('Email already exists.');
      } else {
        setGeneralError(msg);
      }
    }
  };

  const activeGeneralError = generalError || loginError;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #F8F3EA)', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.25rem 2rem 2rem 2rem', background: '#FFFDF8', border: '3.5px solid #1B2233', boxShadow: '10px 10px 0px #1B2233', borderRadius: '24px', position: 'relative' }}>
        
        {/* Paper Craft Aesthetics */}
        <div className="washi-tape-tr"></div>
        <div className="paper-clip-badge-left">📎</div>
        
        {/* Centered Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
          <SwaplyLogo size={64} style={{ margin: '0 auto' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#1B2233', margin: '0.5rem 0 0 0', textAlign: 'center' }}>
            Register
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#7A7A7A', fontFamily: 'var(--font-mono)', margin: '0.25rem 0 0 0', textAlign: 'center' }}>
            Create Swaply Tester Account
          </p>
        </div>

        {/* General Error Banner */}
        {activeGeneralError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '2px solid #BE4D4D', background: '#FFF0EB', padding: '0.75rem', borderRadius: '10px', marginBottom: '1.25rem', color: '#BE4D4D', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{activeGeneralError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          
          {/* Full Name */}
          <div className="input-group">
            <label htmlFor="reg-name" style={{ fontWeight: 800, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem', color: '#1B2233' }}>
              Full Name
            </label>
            <AnimatedInput
              id="reg-name"
              type="text"
              placeholderExamples={NAME_EXAMPLES}
              placeholder="e.g. Alice Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Username + Inline Error */}
          <div className="input-group">
            <label htmlFor="reg-username" style={{ fontWeight: 800, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#1B2233' }}>
              <BrandThreadsIcon size={16} color="#D85B3E" />
              <span>Username</span>
            </label>
            <AnimatedInput
              id="reg-username"
              type="text"
              placeholderExamples={USERNAME_EXAMPLES}
              placeholder="e.g. alice"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError('');
              }}
              disabled={isSubmitting}
              required
              style={usernameError ? { border: '2.5px solid #BE4D4D', background: '#FFF0EB' } : {}}
            />
            {usernameError && (
              <div style={{ color: '#BE4D4D', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={14} /> {usernameError}
              </div>
            )}
          </div>

          {/* Email Address + Inline Error */}
          <div className="input-group">
            <label htmlFor="reg-email" style={{ fontWeight: 800, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', color: '#1B2233' }}>
              <BrandThreadsIcon size={16} color="#D85B3E" />
              <span>Email Address</span>
            </label>
            <AnimatedInput
              id="reg-email"
              type="email"
              placeholderExamples={EMAIL_EXAMPLES}
              placeholder="e.g. alice@swaply.app"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              disabled={isSubmitting}
              required
              style={emailError ? { border: '2.5px solid #BE4D4D', background: '#FFF0EB' } : {}}
            />
            {emailError && (
              <div style={{ color: '#BE4D4D', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertCircle size={14} /> {emailError}
              </div>
            )}
          </div>
          
          {/* Password */}
          <div className="input-group">
            <label htmlFor="reg-pass" style={{ fontWeight: 800, fontSize: '0.82rem', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem', color: '#1B2233' }}>
              Secure Password
            </label>
            <AnimatedInput
              id="reg-pass"
              type={showPassword ? 'text' : 'password'}
              placeholderExamples={PASSWORD_EXAMPLES}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#7A7A7A',
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

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '0.85rem',
              borderRadius: '50px',
              background: isSubmitting ? '#7A7A7A' : '#D85B3E',
              border: '2.5px solid #1B2233',
              boxShadow: isSubmitting ? 'none' : '6px 6px 0px 0px #1B2233',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              fontFamily: 'var(--font-body)'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Creating Profile...
              </>
            ) : (
              'Register Account'
            )}
          </button>
          
          <div style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            Already have an account? <Link to="/login" style={{ color: '#D85B3E', fontWeight: 800, textDecoration: 'underline' }}>Login here</Link>
          </div>
        </form>

      </div>
    </div>
  );
}
