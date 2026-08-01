import { startScreenshotDetection } from './screenshotDetector';
import { socketClient } from '../utils/socketClient';

const getBackendUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:5000`;
    }
  }
  return 'https://videocall-webrtc-uiwb.onrender.com';
};

const BACKEND_URL = getBackendUrl();

export function startCaptureProtection({
  sessionId,
  authToken,
  onLocalWarning,
  onRemoteWarning,
  onBlurRemoteVideo,
  onEscalate
}) {
  if (!sessionId || !authToken) return () => {};

  let eventCount = 0;

  const handleCaptureDetected = async (detectionData) => {
    eventCount++;

    const isDefiniteScreenshot = detectionData.source === 'SCREENSHOT_KEY';
    const eventType = isDefiniteScreenshot ? 'screenshot_attempt' : 'capture_risk';

    // 1. Show immediate warning to the attempting user locally
    if (onLocalWarning) {
      onLocalWarning(detectionData.source);
    }

    // 2. Temporarily blur video / privacy protection mode
    if (onBlurRemoteVideo) {
      onBlurRemoteVideo(true);
      // Automatically lift blur after 5 seconds
      setTimeout(() => {
        onBlurRemoteVideo(false);
      }, 5000);
    }

    // 3. Escalation logic (Module 10)
    if (eventCount >= 3 && onEscalate) {
      onEscalate();
    }

    // 4. Send real-time notice to peer via socket
    const socket = socketClient.getSocket();
    if (socket) {
      socket.emit('privacy_capture_warning', { sessionId, source: detectionData.source });
    }

    // 5. Log security event on backend API (Module 4)
    try {
      await fetch(`${BACKEND_URL}/api/privacy/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          eventType,
          callId: sessionId,
          browser: detectionData.browser,
          platform: detectionData.platform,
          metadata: {
            source: detectionData.source,
            detectionMeta: detectionData.metadata,
            escalationLevel: eventCount
          }
        })
      });
    } catch (err) {
      console.error('Error logging privacy event:', err);
    }
  };

  // Start best-effort browser screenshot event tracking
  const stopDetection = startScreenshotDetection(handleCaptureDetected);

  return () => {
    stopDetection();
  };
}
