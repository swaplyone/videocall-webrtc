import React from 'react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Activity, 
  Minimize2, 
  Maximize2, 
  Tv, 
  MessageSquare, 
  RefreshCw 
} from 'lucide-react';

/**
 * CallControls Component
 * Renders the horizontal mechanical control console during active calls.
 * 
 * @param {object} props
 * @param {boolean} props.isVideoOff True if local video feed is muted
 * @param {boolean} props.isMuted True if local audio feed is muted
 * @param {boolean} props.isChatOpen True if chat drawer overlay is active
 * @param {boolean} props.showDevStats True if developer telemetry logs are visible
 * @param {boolean} props.isMinimized True if the overlay is scaled down
 * @param {object} props.devices Object containing lists of enumerated media inputs
 * @param {React.RefObject} props.remoteVideoRef Reference to the remote HTML5 video element
 * @param {function} props.onToggleVideo Handler to toggle local camera
 * @param {function} props.onToggleMute Handler to toggle local microphone
 * @param {function} props.onToggleChat Handler to toggle chat panel
 * @param {function} props.onToggleDevStats Handler to toggle developer logs panel
 * @param {function} props.onTogglePiP Handler to toggle picture-in-picture mode
 * @param {function} props.onToggleFullscreen Handler to toggle full window display
 * @param {function} props.onToggleMinimize Handler to toggle desktop minimized state
 * @param {function} props.onSwitchCamera Handler to cycle through available cameras
 * @param {function} props.onHangUp Handler to terminate the call session
 */
export default function CallControls({
  isVideoOff,
  isMuted,
  isChatOpen,
  showDevStats,
  isMinimized,
  devices,
  remoteVideoRef,
  onToggleVideo,
  onToggleMute,
  onToggleChat,
  onToggleDevStats,
  onTogglePiP,
  onToggleFullscreen,
  onToggleMinimize,
  onSwitchCamera,
  onHangUp
}) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '2.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem 1.75rem',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '9999px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
      zIndex: 100
    }}>
      {/* Dev Stats Toggle */}
      <button
        className={`control-btn ${showDevStats ? 'active-off' : ''}`}
        onClick={onToggleDevStats}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: 'none',
          background: showDevStats ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.08)',
          color: showDevStats ? '#a78bfa' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title="Toggle Developer WebRTC Stats"
      >
        <Activity size={18} />
      </button>

      {/* Video Mute Toggle */}
      <button
        className={`control-btn ${isVideoOff ? 'active-off' : ''}`}
        onClick={onToggleVideo}
        title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
      >
        {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
      </button>

      {/* Switch Camera Button (Front/Back) */}
      {devices && devices.videoInputs && devices.videoInputs.length > 1 && (
        <button
          className="control-btn"
          onClick={onSwitchCamera}
          title="Switch Camera (Front/Rear)"
        >
          <RefreshCw size={20} />
        </button>
      )}

      {/* Hang Up Action */}
      <button
        className="control-btn btn-danger"
        onClick={onHangUp}
        title="End Call"
      >
        <PhoneOff size={22} />
      </button>

      {/* Audio Mute Toggle */}
      <button
        className={`control-btn ${isMuted ? 'active-off' : ''}`}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
      >
        {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
      </button>

      {/* Chat Drawer Toggle */}
      <button
        className={`control-btn ${isChatOpen ? 'active-off' : ''}`}
        onClick={onToggleChat}
        title="Toggle In-Call Chat"
      >
        <MessageSquare size={20} />
      </button>

      {/* Picture-in-Picture Button */}
      {(() => {
        const isPiPSupported = typeof document.pictureInPictureEnabled !== 'undefined' || 
          (remoteVideoRef && remoteVideoRef.current && typeof remoteVideoRef.current.requestPictureInPicture === 'function') ||
          typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function';
        return (
          <button
            className="control-btn"
            onClick={onTogglePiP}
            disabled={!isPiPSupported}
            style={{ opacity: isPiPSupported ? 1 : 0.4, cursor: isPiPSupported ? 'pointer' : 'not-allowed' }}
            title={isPiPSupported ? "Picture-in-Picture Mode" : "Picture-in-Picture not supported by your browser"}
          >
            <Tv size={20} />
          </button>
        );
      })()}

      {/* Fullscreen Button */}
      {(() => {
        const isFullscreenSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled);
        return (
          <button
            className="control-btn"
            onClick={onToggleFullscreen}
            disabled={!isFullscreenSupported}
            style={{ opacity: isFullscreenSupported ? 1 : 0.4, cursor: isFullscreenSupported ? 'pointer' : 'not-allowed' }}
            title={isFullscreenSupported ? "Toggle Fullscreen" : "Fullscreen mode not supported by your browser"}
          >
            <Maximize2 size={20} />
          </button>
        );
      })()}

      {/* Minimize Overlay Button */}
      <button
        className={`control-btn ${isMinimized ? 'active-off' : ''}`}
        onClick={onToggleMinimize}
        title={isMinimized ? "Maximize Window" : "Minimize Window"}
      >
        <Minimize2 size={20} />
      </button>
    </div>
  );
}
