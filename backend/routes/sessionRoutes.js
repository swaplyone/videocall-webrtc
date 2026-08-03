import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/sessions
 * Fetch active login sessions for user
 */
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query(
      'SELECT * FROM user_sessions WHERE user_id = $1 ORDER BY last_active_at DESC',
      [userId]
    );

    res.json({
      success: true,
      sessions: result.rows
    });
  } catch (err) {
    console.error('Error fetching user sessions:', err);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

/**
 * DELETE /api/sessions/:id
 * Revoke specific session
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const sessionId = req.params.id;

  try {
    await query('DELETE FROM user_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (err) {
    console.error('Error revoking session:', err);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

/**
 * POST /api/sessions/logout-others
 * Revoke all other active sessions
 */
router.post('/logout-others', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const currentToken = req.headers.authorization?.split(' ')[1];

  try {
    if (currentToken) {
      await query('DELETE FROM user_sessions WHERE user_id = $1 AND session_token != $2', [userId, currentToken]);
    } else {
      await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    }

    res.json({ success: true, message: 'All other sessions logged out' });
  } catch (err) {
    console.error('Error logging out other sessions:', err);
    res.status(500).json({ error: 'Failed to logout other sessions' });
  }
});

/**
 * POST /api/sessions/trust
 * Toggle trusted status or rename device
 */
router.post('/trust', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { sessionId, deviceName, isTrusted } = req.body;

  try {
    if (deviceName) {
      await query('UPDATE user_sessions SET device_name = $1 WHERE id = $2 AND user_id = $3', [deviceName, sessionId, userId]);
    }

    if (typeof isTrusted === 'boolean') {
      await query('UPDATE user_sessions SET is_trusted = $1 WHERE id = $2 AND user_id = $3', [isTrusted, sessionId, userId]);
    }

    res.json({ success: true, message: 'Device trust updated' });
  } catch (err) {
    console.error('Error updating session device trust:', err);
    res.status(500).json({ error: 'Failed to update device trust' });
  }
});

export default router;
