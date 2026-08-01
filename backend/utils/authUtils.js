import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'swaply_jwt_refresh_secret_key_67890';

/**
 * Hashes a plain-text password using bcrypt.
 * 
 * @param {string} password Plain-text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Compares a plain-text password against a stored bcrypt hash.
 * 
 * @param {string} password Plain-text password
 * @param {string} hash Stored bcrypt hash
 * @returns {Promise<boolean>} Match result
 */
export async function comparePassword(password, hash) {
  return bcryptjs.compare(password, hash);
}

/**
 * Generates a short-lived access JWT token.
 * 
 * @param {object} user User object containing id and username
 * @returns {string} Signed access token
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, securityId: user.security_id },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generates a long-lived refresh JWT token.
 * 
 * @param {object} user User object containing id and username
 * @returns {string} Signed refresh token
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, securityId: user.security_id },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}
