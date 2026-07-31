/**
 * Swaply WebRTC Helper and Telemetry Parser Utilities
 */

/**
 * Classifies the call quality level based on packet loss, RTT, and jitter metrics.
 * 
 * @param {number} lossRate Percentage of packets lost (0-100)
 * @param {number} rttMs Round-trip time in milliseconds
 * @param {number} jitterMs Jitter variation in milliseconds
 * @returns {string} The quality status classification: 'Excellent', 'Good', 'Fair', 'Poor', or 'Critical'
 */
export function calculateQualityLevel(lossRate = 0, rttMs = 0, jitterMs = 0) {
  if (lossRate > 15 || rttMs > 400 || jitterMs > 100) return 'Critical';
  if (lossRate > 8 || rttMs > 250 || jitterMs > 50) return 'Poor';
  if (lossRate > 3 || rttMs > 150 || jitterMs > 30) return 'Fair';
  if (lossRate > 1 || rttMs > 80 || jitterMs > 15) return 'Good';
  return 'Excellent';
}

/**
 * Parses a standard ICE candidate string to identify its connection type.
 * 
 * @param {string} candStr The raw RTCIceCandidate.candidate string
 * @returns {string} Connection type classification: 'host', 'srflx', 'relay', or 'unknown'
 */
export function parseIceCandidateType(candStr = '') {
  if (!candStr) return 'unknown';
  if (candStr.includes('typ host')) return 'host';
  if (candStr.includes('typ srflx')) return 'srflx';
  if (candStr.includes('typ relay')) return 'relay';
  return 'unknown';
}

/**
 * Maps a target resolution mode or connection quality level to WebRTC encoding constraints.
 * 
 * @param {string} mode The target scaling mode (e.g. 'Low', 'Medium', 'High')
 * @returns {object} The target constraints: { maxBitrate, scaleResolutionDownBy }
 */
export function getBandwidthConstraints(mode = 'High') {
  switch (mode) {
    case 'Low':
    case 'Poor':
    case 'Critical':
      return { maxBitrate: 100000, scaleResolutionDownBy: 4.0 };
    case 'Medium':
    case 'Fair':
      return { maxBitrate: 500000, scaleResolutionDownBy: 2.0 };
    case 'High':
    case 'Good':
    case 'Excellent':
    default:
      return { maxBitrate: 1500000, scaleResolutionDownBy: 1.0 };
  }
}
