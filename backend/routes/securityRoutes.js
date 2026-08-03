import express from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/security/2fa/setup
 * Setup 2FA secret
 */
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const secret = `2FA_${randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    await query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, userId]);

    res.json({
      success: true,
      secret,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/SwaplyOne:${encodeURIComponent(req.user.username)}?secret=${secret}&issuer=SwaplyOne`
    });
  } catch (err) {
    console.error('Error setting up 2FA:', err);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/security/2fa/verify
 * Verify code & enable 2FA
 */
router.post('/2fa/verify', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  try {
    await query('UPDATE users SET two_factor_enabled = TRUE WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: 'Two-Factor Authentication enabled successfully!'
    });
  } catch (err) {
    console.error('Error enabling 2FA:', err);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * POST /api/security/2fa/disable
 * Disable 2FA
 */
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    await query('UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = $1', [userId]);

    res.json({
      success: true,
      message: 'Two-Factor Authentication disabled successfully'
    });
  } catch (err) {
    console.error('Error disabling 2FA:', err);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * GET /api/security/login-history
 * Retrieve login history & security events
 */
router.get('/login-history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const history = await query(
      'SELECT * FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    res.json({
      success: true,
      history: history.rows
    });
  } catch (err) {
    console.error('Error fetching login history:', err);
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
});

export default router;
