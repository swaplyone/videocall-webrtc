import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Smartphone, Key, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function SecurityCenter() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [loginHistory, setLoginHistory] = useState([]);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await apiClient.request('/api/security/login-history');
      if (data && data.history) setLoginHistory(data.history);
    } catch (err) {
      console.warn('Could not load login history:', err.message);
    }
  };

  const handleSetup2FA = async () => {
    setMsg(null);
    setError(null);
    try {
      const data = await apiClient.request('/api/security/2fa/setup', { method: 'POST' });
      if (data && data.secret) {
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
      }
    } catch (err) {
      setError(err.message || 'Failed to setup 2FA');
    }
  };

  const handleVerify2FA = async () => {
    setMsg(null);
    setError(null);
    try {
      const data = await apiClient.request('/api/security/2fa/verify', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      if (data && data.success) {
        setTwoFactorEnabled(true);
        setQrCodeUrl(null);
        setMsg('Two-Factor Authentication is now enabled!');
      }
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ borderBottom: '3px solid #111827', paddingBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} /> Advanced Security Center
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Two-Factor Authentication, Device Trust, and Login Audit Trail
        </span>
      </div>

      {msg && (
        <div style={{ background: '#ECFDF5', border: '2px solid #111827', padding: '0.75rem', borderRadius: '6px', color: '#047857', fontWeight: 'bold' }}>
          {msg}
        </div>
      )}

      {error && (
        <div style={{ background: '#FEE2E2', border: '2px solid #111827', padding: '0.75rem', borderRadius: '6px', color: '#B91C1C', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {/* 2FA Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem' }}>
              🔐 Two-Factor Authentication (2FA)
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Status: <strong>{twoFactorEnabled ? 'ENABLED (Protected)' : 'DISABLED'}</strong>
            </span>
          </div>

          {!twoFactorEnabled && !qrCodeUrl && (
            <button onClick={handleSetup2FA} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              Enable 2FA Protection
            </button>
          )}
        </div>

        {qrCodeUrl && (
          <div style={{ border: '2px dashed #111827', padding: '1rem', borderRadius: '8px', background: '#FFF', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>
              1. Scan this QR Code with Google Authenticator or Authy:
            </p>
            <img src={qrCodeUrl} alt="2FA QR Code" style={{ width: '180px', height: '180px', border: '2px solid #111827', borderRadius: '8px' }} />
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', background: '#F3F4F6', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
              Manual Key: {secret}
            </span>

            <div style={{ width: '100%', maxWidth: '320px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>
                2. Enter 6-Digit Code:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold', textAlign: 'center', fontSize: '1rem' }}
                />
                <button onClick={handleVerify2FA} className="btn btn-primary">Verify & Activate</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem' }}>
          📱 Recent Login & Device Audit Log
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#111827', color: '#FFF', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Device / Browser</th>
                <th style={{ padding: '0.5rem' }}>IP Address</th>
                <th style={{ padding: '0.5rem' }}>Location</th>
                <th style={{ padding: '0.5rem' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No recent logins logged.
                  </td>
                </tr>
              ) : (
                loginHistory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{item.device_name || 'Web Device'} ({item.browser || 'Browser'})</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)' }}>{item.ip_address || '127.0.0.1'}</td>
                    <td style={{ padding: '0.5rem' }}>{item.location || 'Localhost'}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(item.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
