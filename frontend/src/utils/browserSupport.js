/**
 * Swaply Browser Compatibility & Feature Detection Utility
 * Designed to run in both real browser contexts and Node.js mock testing environments.
 * 
 * @param {string} userAgent The navigator.userAgent string to evaluate.
 * @param {object} globals Mock window, navigator, document globals (for testing).
 * @returns {object} The compatibility report.
 */
export function checkBrowserCompatibility(userAgent = '', globals = {}) {
  const isBrowser = typeof window !== 'undefined';
  const ua = userAgent || (isBrowser ? navigator.userAgent : '');
  const win = globals.window || (isBrowser ? window : {});
  const nav = globals.navigator || (isBrowser ? navigator : {});
  const doc = globals.document || (isBrowser ? document : {});
  const loc = globals.location || (isBrowser ? window.location : {});
  const isSecCtx = typeof globals.isSecureContext !== 'undefined' 
    ? globals.isSecureContext 
    : (isBrowser ? window.isSecureContext : true);

  // 1. Parse Browser Name and Version from UserAgent
  let name = 'Unknown Browser';
  let version = 'Unknown';

  if (/edg/i.test(ua)) {
    name = 'Microsoft Edge';
    const match = ua.match(/edg\/(\d+\.\d+)/i);
    if (match) version = match[1];
  } else if (/chrome|crios/i.test(ua) && !/opr|opios|edg/i.test(ua)) {
    name = 'Google Chrome';
    const match = ua.match(/chrome\/(\d+\.\d+)/i);
    if (match) version = match[1];
  } else if (/firefox|fxios/i.test(ua)) {
    name = 'Mozilla Firefox';
    const match = ua.match(/firefox\/(\d+\.\d+)/i);
    if (match) version = match[1];
  } else if (/safari/i.test(ua) && !/chrome|crios|opr|opios|edg/i.test(ua)) {
    name = 'Apple Safari';
    const match = ua.match(/version\/(\d+\.\d+)/i);
    if (match) version = match[1];
  } else if (/opr/i.test(ua)) {
    name = 'Opera';
    const match = ua.match(/opr\/(\d+\.\d+)/i);
    if (match) version = match[1];
  }

  // 2. Perform Browser API & Feature Detection Checks
  const features = {
    webRTC: typeof win.RTCPeerConnection !== 'undefined',
    getUserMedia: !!(nav.mediaDevices && nav.mediaDevices.getUserMedia),
    enumerateDevices: !!(nav.mediaDevices && nav.mediaDevices.enumerateDevices),
    pictureInPicture: typeof doc.pictureInPictureEnabled !== 'undefined' || 
      (win.HTMLVideoElement && win.HTMLVideoElement.prototype && typeof win.HTMLVideoElement.prototype.requestPictureInPicture === 'function'),
    fullscreen: !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled || doc.mozFullScreenEnabled || doc.msFullscreenEnabled),
    replaceTrack: typeof win.RTCRtpSender !== 'undefined' && 
      win.RTCRtpSender.prototype && 
      typeof win.RTCRtpSender.prototype.replaceTrack === 'function',
    setParameters: typeof win.RTCRtpSender !== 'undefined' && 
      win.RTCRtpSender.prototype && 
      typeof win.RTCRtpSender.prototype.setParameters === 'function',
    getStats: typeof win.RTCPeerConnection !== 'undefined' && 
      win.RTCPeerConnection.prototype && 
      typeof win.RTCPeerConnection.prototype.getStats === 'function'
  };

  // 3. Score Compatibility Level & Compile Recommendations
  let status = 'Excellent'; // Excellent, Good, Warning, Unsupported
  let notes = [];

  // Core WebRTC block check
  if (!features.webRTC || !features.getUserMedia) {
    status = 'Unsupported';
    notes.push('WebRTC calling is not supported by this browser. Please upgrade to a modern browser.');
  } else {
    // Specific quirks checks
    if (name === 'Apple Safari') {
      status = 'Good';
      notes.push('Safari has strict autoplay guidelines. Ensure you click to allow media.');
      // Secure Context check
      if (loc.protocol !== 'https:' && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
        notes.push('Safari requires HTTPS secure context to access camera/microphone.');
      }
    } else if (name === 'Mozilla Firefox') {
      if (!features.pictureInPicture) {
        status = 'Good';
        notes.push('Picture-in-Picture mode might be disabled or limited in this browser.');
      }
    } else if (name === 'Unknown Browser') {
      status = 'Warning';
      notes.push('Unrecognized browser. WebRTC compatibility is unverified.');
    }

    // Insecure Context check (for Chrome/Edge/Firefox as well)
    if (!isSecCtx) {
      status = 'Warning';
      notes.push('Insecure HTTP context. Browsers block webcam/mic capture unless on localhost or HTTPS.');
    }
  }

  return {
    browser: { name, version },
    features,
    status,
    notes
  };
}
