import React, { useState, useEffect } from 'react';
import { Settings, Shield, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function SettingsPage({ userDetails, onUpdateUserDetails }) {
  // 1. Email Preferences States
  const [prefFriendRequests, setPrefFriendRequests] = useState(true);
  const [prefSecurityAlerts, setPrefSecurityAlerts] = useState(true);
  const [prefCallQuality, setPrefCallQuality] = useState(false);
  
  // 2. Email Modification States
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  
  // 3. Password Reset States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Feedbacks
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load current preferences
  useEffect(() => {
    if (userDetails?.email_preferences) {
      const prefs = userDetails.email_preferences;
      setPrefFriendRequests(prefs.friendRequests !== false);
      setPrefSecurityAlerts(prefs.securityAlerts !== false);
      setPrefCallQuality(prefs.callQuality === true);
    }
  }, [userDetails]);

  const handlePreferencesSave = async () => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.updateEmailPreferences({
        friendRequests: prefFriendRequests,
        securityAlerts: prefSecurityAlerts,
        callQuality: prefCallQuality
      });
      if (data.success) {
        setSuccess('Notification preferences updated!');
        onUpdateUserDetails(prev => ({
          ...prev,
          email_preferences: {
            friendRequests: prefFriendRequests,
            securityAlerts: prefSecurityAlerts,
            callQuality: prefCallQuality
          }
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to update preferences.');
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const data = await apiClient.requestEmailChange(newEmail.trim());
      if (data.success) {
        setIsEmailOtpSent(true);
        setSuccess(`Verification code sent to ${newEmail.trim()}. Please check your inbox.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to request email change.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    if (!emailOtp.trim()) return;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    try {
      const data = await apiClient.verifyEmailChange(newEmail.trim(), emailOtp.trim());
      if (data.success) {
        setSuccess('Email successfully updated! Old tokens have been invalidated.');
        onUpdateUserDetails(data.user);
        setIsEmailOtpSent(false);
        setNewEmail('');
        setEmailOtp('');
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const data = await apiClient.request('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (data.success) {
        setSuccess('Password updated successfully! Older sessions have been invalidated.');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '650px' }}>
      
      {/* Title console */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Settings size={24} style={{ color: 'var(--color-primary)' }} /> Settings Panel
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Configure notification alerts, modify verified email addresses, or update passwords.
        </p>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-success)', background: 'rgba(16,185,129,0.08)', padding: '0.75rem', borderRadius: '6px', color: 'var(--color-success)', fontSize: '0.85rem' }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239,68,68,0.08)', padding: '0.75rem', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Notification Preferences Card (Module 14) */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Mail size={18} /> Email Notification Preferences
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={prefFriendRequests}
              onChange={(e) => setPrefFriendRequests(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            Friend Connection Invitations
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={prefSecurityAlerts}
              onChange={(e) => setPrefSecurityAlerts(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            Security Incident & Suspicious Pattern Warnings
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={prefCallQuality}
              onChange={(e) => setPrefCallQuality(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            Weekly Call Quality Telemetry Reports
          </label>
        </div>

        <button className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontWeight: 'bold' }} onClick={handlePreferencesSave}>
          Save Preference Configs
        </button>
      </div>

      {/* 2. Change Registered Email (Module 13) */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Mail size={18} style={{ color: 'var(--color-primary)' }} /> Modify Email Address
        </h3>
        
        {!isEmailOtpSent ? (
          <form onSubmit={handleRequestEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="input-group">
              <label htmlFor="new-email" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>New Email Address</label>
              <input
                id="new-email"
                type="email"
                placeholder="e.g. newemail@swaply.app"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem', fontWeight: 'bold' }}>
              {isSubmitting ? 'Requesting OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="input-group">
              <label htmlFor="email-otp" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>6-Digit Verification Code</label>
              <input
                id="email-otp"
                type="text"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="e.g. 123456"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEmailOtpSent(false)}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 2, fontWeight: 'bold' }}>
                {isSubmitting ? 'Verifying...' : 'Verify and Change Email'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 3. Change Account Password */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Lock size={18} /> Change Password
        </h3>
        
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label htmlFor="curr-pass" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Current Password</label>
            <input
              id="curr-pass"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="new-pass" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>New Secure Password</label>
            <input
              id="new-pass"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem', fontWeight: 'bold' }}>
            {isSubmitting ? 'Updating Password...' : 'Modify Account Password'}
          </button>
        </form>
      </div>

    </div>
  );
}
