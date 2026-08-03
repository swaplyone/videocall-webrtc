import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Cpu, HardDrive, Users, Phone, ShieldCheck, Server, RefreshCw, ArrowLeft } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function SystemHealth() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request('/api/monitoring/health');
      if (data && data.health) {
        setHealth(data.health);
      } else {
        setError('Could not load health metrics.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch monitoring telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000); // 5s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #111827', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => navigate('/admin')} className="header-icon-btn" style={{ padding: '0.4rem' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} style={{ color: 'var(--color-primary)' }} /> Live Monitoring & System Health
          </h2>
        </div>
        <button onClick={fetchHealth} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Telemetry
        </button>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.75rem 1rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {health && (
        <>
          {/* Top Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: '#D1FAE5', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Server Status</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#047857', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Server size={22} /> {health.serverStatus}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#064E3B', marginTop: '0.4rem' }}>Uptime: {Math.round(health.uptimeSeconds / 60)} minutes</div>
            </div>

            <div style={{ background: '#FEF3C7', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>CPU Usage</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#78350F', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={22} /> {health.cpu.cores} Cores
              </div>
              <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: '0.4rem' }}>Load Avg: {health.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}</div>
            </div>

            <div style={{ background: '#E0F2FE', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#075985', textTransform: 'uppercase' }}>RAM Usage</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0369A1', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <HardDrive size={22} /> {health.memory.usagePercent}%
              </div>
              <div style={{ fontSize: '0.75rem', color: '#075985', marginTop: '0.4rem' }}>{health.memory.usedMB} MB / {health.memory.totalMB} MB</div>
            </div>

            <div style={{ background: '#F3E8FF', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase' }}>Active Network</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#581C87', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={22} /> {health.activeUsers} Active
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B21A8', marginTop: '0.4rem' }}>Active Calls: {health.activeCalls}</div>
            </div>
          </div>

          {/* Subsystem Health Matrix */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem' }}>
              ⚙️ Infrastructure Telemetry Matrix
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem' }}>PostgreSQL Database Pool</strong>
                <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '0.8rem' }}>🟢 Status: {health.database.toUpperCase()}</span>
              </div>
              <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem' }}>WebRTC Signaling Server (Socket.io)</strong>
                <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '0.8rem' }}>🟢 Status: {health.webrtcSignaling.toUpperCase()}</span>
              </div>
              <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
                <strong style={{ display: 'block', fontSize: '0.85rem' }}>SMTP Mail Gateway</strong>
                <span style={{ color: '#D97706', fontWeight: 'bold', fontSize: '0.8rem' }}>🟡 Status: {health.smtp.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
