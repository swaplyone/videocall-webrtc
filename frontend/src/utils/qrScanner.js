import jsQR from 'jsqr';

/**
 * Decodes a QR code from a flat Uint8ClampedArray containing RGBA pixel data (Module 34).
 * 
 * @param {Uint8ClampedArray} rgbaData 
 * @param {number} width 
 * @param {number} height 
 * @returns {string|null} The decoded text token or null if not found
 */
export function decodeQRFromPixels(rgbaData, width, height) {
  try {
    if (!rgbaData || rgbaData.length !== width * height * 4) {
      return null;
    }
    const code = jsQR(rgbaData, width, height);
    return code ? code.data : null;
  } catch (err) {
    console.error('jsQR decoding failed:', err);
    return null;
  }
}

/**
 * Helper to extract friend token or QR invitation URL from scanned data.
 * Supports raw tokens and full URL paths.
 */
export function parseScannedQRData(data) {
  if (!data) return null;
  
  try {
    // If it's a full URL, extract the token from the path suffix
    if (data.includes('/friends/qr/resolve/')) {
      const parts = data.split('/friends/qr/resolve/');
      return parts[parts.length - 1];
    }
    return data.trim();
  } catch (err) {
    return data.trim();
  }
}
