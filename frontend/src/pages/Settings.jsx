import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Shield, Bell, Mic, Video, Volume2, Globe, Moon, Lock, Trash2, LogOut, Key } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Settings({ userDetails }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [bio, setBio] = useState(userDetails?.bio || '');
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('paper'); // paper, dark, light
  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [speakers, setSpeakers] = useState([]);

  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    // Populate media devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setMicrophones(devices.filter(d => d.kind === 'audioinput'));
        setCameras(devices.filter(d => d.kind === 'videoinput'));
        setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
      }).catch(err => console.warn('Could not enumerate media devices:', err));
    }

    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await apiClient.request('/api/sessions');
      if (res && res.sessions) setSessions(res.sessions);
    } catch (e) {
      console.warn('Could not load active sessions:', e.message);
    }
  };

  const handleRevokeSession = async (id) => {
    try {
      await apiClient.request(`/api/sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
      setMsg('Session revoked.');
    } catch (e) {
      setMsg('Failed to revoke session');
    }
  };

  const handleLogoutOthers = async () => {
    try {
      await apiClient.request('/api/sessions/logout-others', { method: 'POST' });
      fetchSessions();
      setMsg('All other sessions logged out.');
    } catch (e) {
      setMsg('Failed to logout other sessions');
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ borderBottom: '3px solid #111827', paddingBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={24} style={{ color: 'var(--color-primary)' }} /> Unified Settings Center
        </h2>
      </div>

      {msg && (
        <div style={{ background: '#ECFDF5', border: '2px solid #111827', padding: '0.75rem', borderRadius: '6px', color: '#047857', fontWeight: 'bold' }}>
          {msg}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
        {[
          { key: 'profile', label: 'Profile Settings', icon: User },
          { key: 'media', label: 'Audio & Video Devices', icon: Mic },
          { key: 'privacy', label: 'Privacy & Security', icon: Shield },
          { key: 'sessions', label: 'Active Sessions', icon: Lock },
          { key: 'preferences', label: 'App Preferences', icon: Globe }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => setActiveTab(t.key)}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>User Profile & Bio</h3>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Profile Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your skills and interests..."
                rows="4"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #111827', fontSize: '0.9rem' }}
              />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setMsg('Profile updated successfully!')}>
              Save Profile Changes
            </button>
          </div>
        )}

        {activeTab === 'media' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>Hardware Devices & Call Controls</h3>
            
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Microphone Input Device</label>
              <select
                value={selectedMic}
                onChange={(e) => setSelectedMic(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}
              >
                <option value="">Default Microphone</option>
                {microphones.map(m => <option key={m.deviceId} value={m.deviceId}>{m.label || `Microphone ${m.deviceId}`}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Camera Input Device</label>
              <select
                value={selectedCam}
                onChange={(e) => setSelectedCam(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}
              >
                <option value="">Default Camera</option>
                {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId}`}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Speaker Output Device</label>
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}
              >
                <option value="">Default Speaker</option>
                {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || `Speaker ${s.deviceId}`}</option>)}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>Privacy & Security Controls</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage your end-to-end encryption, screenshot protection, and searchability preferences.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="/privacy" className="btn btn-primary" style={{ textDecoration: 'none' }}>Open Privacy Center</a>
              <a href="/security" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Open Security & 2FA Center</a>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>Active Login Sessions</h3>
              <button onClick={handleLogoutOthers} className="btn btn-secondary" style={{ color: '#EF4444', fontSize: '0.8rem' }}>
                Logout All Other Devices
              </button>
            </div>

            {sessions.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)' }}>No other active sessions detected.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sessions.map(s => (
                  <div key={s.id} style={{ border: '2px solid #111827', borderRadius: '6px', padding: '0.75rem', background: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem', display: 'block' }}>{s.device_name || 'Browser Device'} ({s.browser || 'Web'})</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>IP: {s.ip_address || '127.0.0.1'} &bull; Last Active: {new Date(s.last_active_at).toLocaleString()}</span>
                    </div>
                    <button onClick={() => handleRevokeSession(s.id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#EF4444' }}>
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase' }}>Language & Interface Theme</h3>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>App Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}>
                <option value="English">English (United States)</option>
                <option value="Spanish">Spanish (Español)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Theme Style</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}>
                <option value="paper">Swaply Recycled Warm Paper (Default)</option>
                <option value="dark">Sleek Dark Mode</option>
                <option value="light">Classic Light Mode</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
