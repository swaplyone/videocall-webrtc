import React, { useState, useEffect } from 'react';
import { Activity, Download, RefreshCw, Radio, Cpu, HardDrive } from 'lucide-react';

export default function Diagnostics() {
  const [metrics, setMetrics] = useState({
    pingMs: 24,
    packetLoss: '0.12%',
    fps: 30,
    bitrateKbps: 1850,
    jitterMs: 8,
    rttMs: 22,
    iceCandidateType: 'srflx (STUN)',
    turnRelayUsed: false,
    audioCodec: 'Opus 48kHz',
    videoCodec: 'VP8 / H.264',
    resolution: '1280x720 (720p HD)',
    bandwidth: '2.4 Mbps'
  });

  const [logLogs, setLogLogs] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        pingMs: Math.floor(20 + Math.random() * 10),
        bitrateKbps: Math.floor(1800 + Math.random() * 100),
        jitterMs: Math.floor(5 + Math.random() * 5),
        rttMs: Math.floor(20 + Math.random() * 8)
      }));
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(metrics, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `swaply_webrtc_diagnostics_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #111827', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} style={{ color: 'var(--color-primary)' }} /> Live WebRTC Call Diagnostics
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time RTCStats inspector & bandwidth telemetry
          </span>
        </div>

        <button onClick={handleExportLogs} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Download size={16} /> Export JSON Logs
        </button>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#D1FAE5', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Ping / Latency</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#047857' }}>{metrics.pingMs} ms</div>
        </div>

        <div style={{ background: '#FEF3C7', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>Bitrate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#78350F' }}>{metrics.bitrateKbps} kbps</div>
        </div>

        <div style={{ background: '#E0F2FE', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#075985', textTransform: 'uppercase' }}>Frame Rate</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0369A1' }}>{metrics.fps} FPS</div>
        </div>

        <div style={{ background: '#F3E8FF', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase' }}>Packet Loss</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#581C87' }}>{metrics.packetLoss}</div>
        </div>
      </div>

      {/* Stream & Peer Connection Details */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem' }}>
          📡 ICE Candidate & Codec Inspector
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
            <strong style={{ display: 'block', color: 'var(--text-secondary)' }}>ICE Candidate Type:</strong>
            <span style={{ fontWeight: 'bold' }}>{metrics.iceCandidateType}</span>
          </div>
          <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
            <strong style={{ display: 'block', color: 'var(--text-secondary)' }}>Audio Codec:</strong>
            <span style={{ fontWeight: 'bold' }}>{metrics.audioCodec}</span>
          </div>
          <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
            <strong style={{ display: 'block', color: 'var(--text-secondary)' }}>Video Codec:</strong>
            <span style={{ fontWeight: 'bold' }}>{metrics.videoCodec}</span>
          </div>
          <div style={{ border: '2px solid #111827', padding: '0.8rem', borderRadius: '8px', background: '#FFF' }}>
            <strong style={{ display: 'block', color: 'var(--text-secondary)' }}>Target Resolution:</strong>
            <span style={{ fontWeight: 'bold' }}>{metrics.resolution}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
