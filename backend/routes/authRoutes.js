import express from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/authUtils.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { createAndSendOTP, verifyOTP } from '../utils/otpManager.js';
import { sendWelcomeEmail, sendSecurityAlert } from '../services/emailService.js';

const router = express.Router();
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'swaply_jwt_refresh_secret_key_67890';

// 1. User Registration
router.post('/register', async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!name || !username || !email || !password) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_FIELDS',
      message: 'All fields (name, username, email, password) are required'
    });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  // Basic email syntax validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_EMAIL',
      message: 'Invalid email format'
    });
  }

  if (normalizedUsername.length < 3) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_USERNAME',
      message: 'Username must be at least 3 characters long'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PASSWORD',
      message: 'Password must be at least 6 characters long'
    });
  }

  try {
    // 1. Check if username already exists
    const checkUsername = await query(
      'SELECT 1 FROM users WHERE LOWER(username) = $1',
      [normalizedUsername]
    );
    if (checkUsername.rowCount > 0) {
      return res.status(409).json({
        success: false,
        code: 'USERNAME_EXISTS',
        message: 'Username already exists.'
      });
    }

    // 2. Check if email already exists
    const checkEmail = await query(
      'SELECT 1 FROM users WHERE LOWER(email) = $1',
      [normalizedEmail]
    );
    if (checkEmail.rowCount > 0) {
      return res.status(409).json({
        success: false,
        code: 'EMAIL_EXISTS',
        message: 'Email already exists.'
      });
    }

    // Encrypt password
    const hashed = await hashPassword(password);
    const securityId = `sec_${randomUUID()}`;
    const betaId = 'SWP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const qrToken = `qr_tok_${randomUUID()}`;

    // Insert user in Pending Verification state
    const insertRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING id, name, username, email, security_id, beta_id, qr_token, email_verified`,
      [securityId, name.trim(), normalizedUsername, normalizedEmail, hashed, betaId, qrToken]
    );

    const newUser = insertRes.rows[0];

    // Generate & send verification OTP
    await createAndSendOTP(newUser.id, newUser.email, 'FIRST_LOGIN');

    // Create temporary unverified JWT token
    const tempToken = jwt.sign(
      { id: newUser.id, username: newUser.username, securityId: newUser.security_id, email_verified: false },
      JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const io = req.app.get('socketio');
    if (io) {
      io.to('admins').emit('admin_user_registered', { username: newUser.username });
    }

    res.status(201).json({
      success: true,
      pendingVerification: true,
      verificationToken: tempToken,
      tempToken,
      email: newUser.email,
      expiresIn: 300,
      message: 'Account created successfully. Verification code sent to email.',
      data: {
        pendingVerification: true,
        verificationToken: tempToken,
        tempToken,
        email: newUser.email,
        expiresIn: 300,
        user: {
          id: newUser.id,
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
          security_id: newUser.security_id,
          beta_id: newUser.beta_id,
          email_verified: false
        }
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      message: 'Server error during registration'
    });
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

    // Check if account is scheduled for deletion
    if (user.deletion_status === 'PENDING_DELETION') {
      const tempToken = generateAccessToken(user);
      return res.json({
        success: true,
        pending_deletion: true,
        tempToken,
        scheduled_deletion_at: user.scheduled_deletion_at,
        email: user.email,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          beta_id: user.beta_id,
          deletion_status: user.deletion_status,
          scheduled_deletion_at: user.scheduled_deletion_at
        }
      });
    }

    // Check email verification status (Module 5)
    if (!user.email_verified) {
      // Create and send OTP for first login
      const otpRes = await createAndSendOTP(user.id, user.email, 'FIRST_LOGIN');
      if (!otpRes.success) {
        return res.status(otpRes.code || 500).json({ error: otpRes.error });
      }

      // Generate a temporary restricted token (unverified)
      const tempToken = jwt.sign(
        { id: user.id, username: user.username, securityId: user.security_id, email_verified: false },
        JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({
        success: true,
        email_verified: false,
        tempToken,
        email: user.email
      });
    }

    // Ensure user has a beta_id assigned
    if (!user.beta_id) {
      const generatedBetaId = `SWP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await query('UPDATE users SET beta_id = $1 WHERE id = $2', [generatedBetaId, user.id]);
      user.beta_id = generatedBetaId;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Send login notification (Module 22)
    await sendSecurityAlert(user.id, user.email, 'New Login', 'A new login attempt succeeded on your account.');

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
        beta_id: user.beta_id,
        security_id: user.security_id,
        profile_image: user.profile_image,
        bio: user.bio,
        notice_accepted: user.notice_accepted,
        is_admin: user.is_admin,
        email_verified: user.email_verified,
        deletion_status: user.deletion_status
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user details including beta_id
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT id, name, username, email, beta_id, security_id, profile_image, bio, is_admin, email_verified, deletion_status, scheduled_deletion_at, notice_accepted, created_at, last_seen
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const user = userRes.rows[0];

    if (!user.beta_id) {
      const generatedBetaId = `SWP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      await query('UPDATE users SET beta_id = $1 WHERE id = $2', [generatedBetaId, user.id]);
      user.beta_id = generatedBetaId;
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching current user profile:', err);
    res.status(500).json({ error: 'Server error fetching user profile' });
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
      `SELECT id, security_id, name, username, email, profile_image, bio, created_at, last_seen, online_status, notice_accepted,
              beta_id, qr_token, searchable, allow_requests, show_beta_id, qr_active, is_admin
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

/**
 * POST /api/auth/send-otp
 * Generates and sends an OTP (Module 6)
 */
router.post('/send-otp', authenticateToken, async (req, res) => {
  const { purpose } = req.body;
  try {
    const userRes = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const email = userRes.rows[0].email;
    const result = await createAndSendOTP(req.user.id, email, purpose || 'EMAIL_VERIFICATION');
    if (!result.success) {
      if (result.error !== 'Please wait before requesting another code') {
        const io = req.app.get('socketio');
        if (io) io.to('admins').emit('admin_email_failed', { recipient: email, error: result.error });
      }
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Verification code sent' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ error: 'Server error sending verification code' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies OTP and activates the account if required (Module 6, 10, 11)
 */
router.post('/verify-otp', authenticateToken, async (req, res) => {
  const { code, purpose } = req.body;
  if (!code || !purpose) {
    return res.status(400).json({ error: 'Verification code and purpose are required' });
  }

  try {
    const userRes = await query('SELECT email, beta_id FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const result = await verifyOTP(user.email, code, purpose);
    if (!result.success) {
      let codeStr = 'INVALID_OTP';
      let messageStr = 'Invalid verification code.';
      if (result.error === 'Code expired') {
        codeStr = 'OTP_EXPIRED';
        messageStr = 'Verification code has expired.';
      } else if (result.error === 'Too many attempts') {
        codeStr = 'TOO_MANY_ATTEMPTS';
        messageStr = 'Too many verification attempts.';
      }
      return res.status(400).json({
        success: false,
        code: codeStr,
        message: messageStr,
        error: result.error
      });
    }

    if (purpose === 'FIRST_LOGIN' || purpose === 'EMAIL_VERIFICATION') {
      // Mark user as verified in DB
      await query('UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = $1', [req.user.id]);
      
      // Send Welcome email (Module 11)
      await sendWelcomeEmail(req.user.id, user.email, user.beta_id);

      // Re-fetch user to get latest security_id
      const updatedUserRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      const updatedUser = updatedUserRes.rows[0];

      const io = req.app.get('socketio');
      if (io) {
        io.to('admins').emit('admin_user_verified', { username: updatedUser.username, betaId: updatedUser.beta_id });
      }

      // Generate final tokens
      const accessToken = generateAccessToken(updatedUser);
      const refreshToken = generateRefreshToken(updatedUser);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        message: 'Verification successful',
        accessToken,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          username: updatedUser.username,
          email: updatedUser.email,
          security_id: updatedUser.security_id,
          profile_image: updatedUser.profile_image,
          bio: updatedUser.bio,
          notice_accepted: updatedUser.notice_accepted,
          is_admin: updatedUser.is_admin
        }
      });
    }

    res.json({ success: true, message: 'Code verified successfully' });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
});

/**
 * POST /api/auth/resend-otp
 * Resends the verification code (Module 6)
 */
router.post('/resend-otp', authenticateToken, async (req, res) => {
  const { purpose } = req.body;
  try {
    const userRes = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const email = userRes.rows[0].email;
    const result = await createAndSendOTP(req.user.id, email, purpose || 'EMAIL_VERIFICATION');
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }
    res.json({ success: true, message: 'Verification code resent' });
  } catch (err) {
    console.error('Error resending OTP:', err);
    res.status(500).json({ error: 'Server error resending code' });
  }
});

/**
 * POST /api/auth/request-password-reset
 * Request a reset OTP via email (Module 12)
 */
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const userRes = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rowCount > 0) {
      const userId = userRes.rows[0].id;
      await createAndSendOTP(userId, email, 'PASSWORD_RESET');
    }
    // Security: Always return success response to prevent email harvesting (Module 9)
    res.json({ success: true, message: 'If email exists, verification code was sent' });
  } catch (err) {
    console.error('Error requesting password reset:', err);
    res.status(500).json({ error: 'Server error requesting password reset' });
  }
});

/**
 * POST /api/auth/verify-password-reset
 * Pre-validation for password reset code (Module 12)
 */
router.post('/verify-password-reset', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    // Check and pre-validate, do not mark as used yet so reset endpoint can consume it
    const codeRes = await query(
      `SELECT * FROM email_verification_codes
       WHERE email = $1 AND purpose = 'PASSWORD_RESET' AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (codeRes.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const record = codeRes.rows[0];
    const { hashOTP } = await import('../utils/otp.js');
    if (record.code_hash !== hashOTP(code)) {
      await query(
        'UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE id = $1',
        [record.id]
      );
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    res.json({ success: true, message: 'Verification successful' });
  } catch (err) {
    console.error('Error pre-verifying password reset:', err);
    res.status(500).json({ error: 'Server error verifying reset code' });
  }
});

/**
 * POST /api/auth/reset-password
 * Resets the password and invalidates active tokens (Module 12, 23)
 */
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const result = await verifyOTP(email, code, 'PASSWORD_RESET');
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const userRes = await query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userId = userRes.rows[0].id;

    const hashed = await hashPassword(newPassword);
    const newSecurityId = `sec_${randomUUID()}`;

    await query(
      'UPDATE users SET password_hash = $1, security_id = $2, updated_at = NOW() WHERE id = $3',
      [hashed, newSecurityId, userId]
    );

    await sendSecurityAlert(userId, email, 'Password Changed', 'Your account password was successfully reset.');

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Server error resetting password' });
  }
});

/**
 * POST /api/auth/request-email-change
 * Generates OTP for new email change confirmation (Module 13)
 */
router.post('/request-email-change', authenticateToken, async (req, res) => {
  const { newEmail } = req.body;
  if (!newEmail) {
    return res.status(400).json({ error: 'New email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    const checkUser = await query('SELECT 1 FROM users WHERE email = $1', [newEmail.trim().toLowerCase()]);
    if (checkUser.rowCount > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const result = await createAndSendOTP(req.user.id, newEmail, 'EMAIL_CHANGE');
    if (!result.success) {
      return res.status(result.code || 400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Verification code sent to new email address' });
  } catch (err) {
    console.error('Error requesting email change:', err);
    res.status(500).json({ error: 'Server error requesting email change' });
  }
});

/**
 * POST /api/auth/verify-email-change
 * Verifies OTP and swaps emails, invalidating session security (Module 13, 23)
 */
router.post('/verify-email-change', authenticateToken, async (req, res) => {
  const { newEmail, code } = req.body;
  if (!newEmail || !code) {
    return res.status(400).json({ error: 'New email and verification code are required' });
  }

  try {
    const result = await verifyOTP(newEmail, code, 'EMAIL_CHANGE');
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const oldEmailRes = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const oldEmail = oldEmailRes.rows[0]?.email || '';

    const newSecurityId = `sec_${randomUUID()}`;
    await query(
      'UPDATE users SET email = $1, security_id = $2, updated_at = NOW() WHERE id = $3',
      [newEmail.trim().toLowerCase(), newSecurityId, req.user.id]
    );

    if (oldEmail) {
      await sendSecurityAlert(req.user.id, oldEmail, 'Email Changed', `Your account email was changed to ${newEmail}.`);
    }
    await sendSecurityAlert(req.user.id, newEmail, 'Email Changed', `Your account email was changed to this address.`);

    res.json({ success: true, message: 'Email address updated successfully' });
  } catch (err) {
    console.error('Error verifying email change:', err);
    res.status(500).json({ error: 'Server error verifying email change' });
  }
});

/**
 * PUT /api/auth/email-preferences
 * Updates user preferences (Module 14)
 */
router.put('/email-preferences', authenticateToken, async (req, res) => {
  const { friendRequests, friendAccepted, betaUpdates, productAnnouncements } = req.body;
  try {
    const preferences = {
      friendRequests: friendRequests !== false,
      friendAccepted: friendAccepted !== false,
      betaUpdates: betaUpdates !== false,
      productAnnouncements: productAnnouncements !== false
    };

    await query(
      'UPDATE users SET email_notifications = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(preferences), req.user.id]
    );

    res.json({ success: true, message: 'Notification preferences updated', preferences });
  } catch (err) {
    console.error('Error updating notification preferences:', err);
    res.status(500).json({ error: 'Server error updating notification preferences' });
  }
});

export { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
export default router;
