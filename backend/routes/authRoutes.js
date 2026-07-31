import express from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/authUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'swaply_jwt_refresh_secret_key_67890';

// 1. User Registration
router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields (name, username, email, password) are required' });
  }

  // Basic email syntax validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Check if username or email already exists
    const checkUser = await query(
      'SELECT 1 FROM users WHERE username = $1 OR email = $2',
      [username.trim(), email.trim()]
    );
    if (checkUser.rowCount > 0) {
      return res.status(409).json({ error: 'Username or email already registered' });
    }

    // Encrypt password
    const hashed = await hashPassword(password);
    const securityId = `sec_${randomUUID()}`;

    // Insert user
    const insertRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, username, email, security_id`,
      [securityId, name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), hashed]
    );

    const newUser = insertRes.rows[0];
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        security_id: newUser.security_id
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// 2. User Login
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be username or email

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier (username/email) and password are required' });
  }

  try {
    // Find user
    const userRes = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [identifier.trim().toLowerCase()]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = userRes.rows[0];

    // Verify password
    const match = await comparePassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set refresh token cookie (HttpOnly for security)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        security_id: user.security_id,
        profile_image: user.profile_image,
        bio: user.bio,
        notice_accepted: user.notice_accepted
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 3. Token Refresh
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired refresh token' });
      }

      // Generate a new short-lived access token
      const newAccessToken = jwt.sign(
        { id: decoded.id, username: decoded.username },
        process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345',
        { expiresIn: '15m' }
      );

      res.json({ success: true, accessToken: newAccessToken });
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    res.status(500).json({ error: 'Server error during token refresh' });
  }
});

// 4. User Logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true, message: 'Logged out successfully' });
});

// 5. Get Profile (Protected)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT id, security_id, name, username, email, profile_image, bio, created_at, last_seen, online_status, notice_accepted 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(444).json({ error: 'User profile not found' });
    }

    res.json({ success: true, user: userRes.rows[0] });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// 6. Update Profile (Protected)
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, bio, profile_image } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const updateRes = await query(
      `UPDATE users 
       SET name = $1, bio = $2, profile_image = $3, updated_at = NOW() 
       WHERE id = $4
       RETURNING id, name, username, email, profile_image, bio, updated_at`,
      [name.trim(), bio ? bio.trim() : null, profile_image ? profile_image.trim() : null, req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updateRes.rows[0]
    });

  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error updating user profile' });
  }
});

/**
 * POST /api/auth/accept-notice
 * 
 * Persists the privacy and safety notice modal acknowledgment status to the database.
 */
router.post('/accept-notice', authenticateToken, async (req, res) => {
  try {
    const updateRes = await query(
      'UPDATE users SET notice_accepted = TRUE, updated_at = NOW() WHERE id = $1 RETURNING notice_accepted',
      [req.user.id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      success: true,
      message: 'Privacy notice successfully accepted',
      notice_accepted: true
    });
  } catch (err) {
    console.error('Error accepting safety notice:', err);
    res.status(500).json({ error: 'Server error updating safety notice acknowledgment' });
  }
});

export default router;
