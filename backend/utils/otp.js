import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit random numeric OTP code (Module 3).
 * Example: "482913"
 * 
 * @returns {string}
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Creates a secure SHA-256 hash of the plain text OTP code.
 * OTP codes are stored as hashes in the database to prevent compromises (Module 3).
 * 
 * @param {string} otp 
 * @returns {string} Hex encoded SHA-256 hash
 */
export function hashOTP(otp) {
  if (!otp) return '';
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}
