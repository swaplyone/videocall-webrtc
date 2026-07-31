import React from 'react';
import { VideoOff, ShieldAlert } from 'lucide-react';

/**
 * PreCallLobby Component
 * Renders the pre-call CRT monitor stage, microphone visual activity meter,
 * browser permission checklist, and join/decline actions.
 * 
 * @param {object} props
 * @param {MediaStream|null} props.localStream Active local video/audio MediaStream
 * @param {number} props.micVolume Microphones audio input amplitude percentage (0-100)
 * @param {object} props.devices Object containing lists of enumerated media inputs
 * @param {string} props.selectedVideoInput The active video camera device ID
 * @param {string} props.selectedAudioInput The active microphone input device ID
 * @param {string} props.selectedAudioOutput The active speaker output device ID
 * @param {string} props.networkLatency The current network latency description
 * @param {string} props.networkStatus Network latency categorization status
 * @param {function} props.bindLocalVideo Callback ref to bind local stream to video tag
 * @param {function} props.handleSwitchCamera Handler called when camera dropdown changes
 * @param {function} props.handleSwitchMicrophone Handler called when microphone dropdown changes
 * @param {function} props.handleSwitchSpeaker Handler called when speaker dropdown changes
 * @param {function} props.playSpeakerTest Action handler to play test beep sound
 * @param {function} props.handleDisconnect Cancel action handler
 * @param {function} props.handleJoinCall Join action handler
 * @param {string|null} props.permissionsError Error message if camera/microphone access failed
 * @param {function} props.onRequestPermissions Action handler to request media permissions again
 */
export default function PreCallLobby({
  localStream,
  micVolume,
  devices,
  selectedVideoInput,
  selectedAudioInput,
  selectedAudioOutput,
  networkLatency,
  networkStatus,
  bindLocalVideo,
  handleSwitchCamera,
  handleSwitchMicrophone,
  handleSwitchSpeaker,
  playSpeakerTest,
  handleDisconnect,
  handleJoinCall,
  permissionsError,
  onRequestPermissions
}) {
  const hasCamera = localStream && localStream.getVideoTracks().length > 0 && !permissionsError;
  const hasMic = localStream && localStream.getAudioTracks().length > 0 && !permissionsError;

  return (
    <div className="call-fullscreen-overlay pre-call-lobby-wrapper" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)',
      color: '#e4e4e7',
      fontFamily: 'var(--font-sans)',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <div className="glass-panel pre-call-card" style={{
        width: '100%',
        maxWidth: '850px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '2rem',
        boxSizing: 'border-box',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '2.5rem'
      }}>
        {/* Left Column: Live camera view Polaroid style */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Secure Call Preview
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: '0 0 0.5rem 0' }}>
              Verify your devices and settings before joining the session.
            </p>
          </div>

          {/* Video Preview Polaroid Frame */}
          <div className="video-wrapper" style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            background: '#09090b',
            borderRadius: '16px',
            border: '1.5px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
          }}>
            {hasCamera ? (
              <video
                ref={bindLocalVideo}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#71717a', textAlign: 'center', padding: '1rem' }}>
                <VideoOff size={48} />
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>Camera Feed Blocked / Off</span>
                {permissionsError && (
                  <p style={{ fontSize: '0.75rem', color: '#f87171', maxWidth: '250px', margin: '0.5rem 0 0 0' }}>
                    Permission Denied: Swaply needs camera & mic access for secure video calls.
                  </p>
                )}
              </div>
            )}
            <div style={{
              position: 'absolute',
              bottom: '0.75rem',
              left: '0.75rem',
              background: 'rgba(9, 9, 11, 0.65)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#fff',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              Local Feed
            </div>
          </div>

          {/* Permissions Request Trigger */}
          {permissionsError && (
            <button
              onClick={onRequestPermissions}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '12px',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.18)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              <ShieldAlert size={16} /> Request Camera & Mic Permission
            </button>
          )}

          {/* Mic level visual tester */}
          <div style={{ width: '100%', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1rem', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: '#a1a1aa' }}>Microphone Activity:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: micVolume > 0 ? '#34d399' : '#a1a1aa' }}>
                {micVolume > 0 ? 'Active' : 'Silent'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
              <div style={{ width: `${micVolume}%`, height: '100%', background: 'linear-gradient(to right, #818cf8, #34d399)', transition: 'width 0.08s ease' }}></div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', justifyContent: 'space-between' }}>
          {/* Device dropdowns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#f4f4f5' }}>Device Configuration</h3>
            {devices.videoInputs && devices.videoInputs.length > 0 && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '0.25rem' }}>Camera input:</label>
                <select
                  value={selectedVideoInput}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '0.4rem', outline: 'none' }}
                >
                  {devices.videoInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.substring(0, 5)}`}</option>
                  ))}
                </select>
              </div>
            )}
            {devices.audioInputs && devices.audioInputs.length > 0 && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '0.25rem' }}>Microphone input:</label>
                <select
                  value={selectedAudioInput}
                  onChange={(e) => handleSwitchMicrophone(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '0.4rem', outline: 'none' }}
                >
                  {devices.audioInputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.substring(0, 5)}`}</option>
                  ))}
                </select>
              </div>
            )}
            {devices.audioOutputs && devices.audioOutputs.length > 0 && (
              <div>
                <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: '0.25rem' }}>Speaker output:</label>
                <select
                  value={selectedAudioOutput}
                  onChange={(e) => handleSwitchSpeaker(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', background: '#1e293b', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '0.4rem', outline: 'none' }}
                >
                  {devices.audioOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.substring(0, 5)}`}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Test speaker button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Audio Output Test:</span>
            <button
              onClick={playSpeakerTest}
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#c084fc',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.15s ease'
              }}
            >
              🔊 Play Test Beep
            </button>
          </div>

          {/* Diagnostics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#f4f4f5' }}>System Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Camera Permission:</span>
                <span style={{ color: hasCamera ? '#34d399' : '#f87171', fontWeight: 'bold' }}>{hasCamera ? '✓ Granted' : '✗ Blocked'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Microphone Permission:</span>
                <span style={{ color: hasMic ? '#34d399' : '#f87171', fontWeight: 'bold' }}>{hasMic ? '✓ Granted' : '✗ Blocked'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Network Latency (STUN):</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: networkStatus === 'Excellent' ? '#34d399' : networkStatus === 'Good' ? '#60a5fa' : '#fbbf24', fontWeight: 'bold' }}>
                  {networkLatency} ({networkStatus})
                </span>
              </div>
            </div>
          </div>

          {/* Join Call buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              className="btn btn-danger"
              onClick={handleDisconnect}
              style={{ flex: 1, padding: '0.75rem 0', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Decline / Cancel
            </button>
            <button
              onClick={handleJoinCall}
              style={{
                flex: 1.5,
                padding: '0.75rem 0',
                borderRadius: '10px',
                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                color: '#fff',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 14px 0 rgba(139, 92, 246, 0.4)'
              }}
            >
              Join Call Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
