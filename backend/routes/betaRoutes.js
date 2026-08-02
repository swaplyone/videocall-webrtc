import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as betaRolloutService from '../services/betaRolloutService.js';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/beta/register
 * Registers current user for the SwaplyOne Beta Waitlist
 */
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await query('SELECT id, name, username, email, beta_id FROM users WHERE id = $1', [userId]);

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User account not found' });
    }

    const user = userRes.rows[0];
    const entry = await betaRolloutService.registerUserForWaitlist({
      userId: user.id,
      username: user.username,
      email: user.email,
      betaId: user.beta_id
    });

    res.json({
      success: true,
      message: 'Successfully registered for SwaplyOne Beta Waitlist',
      waitlistEntry: entry
    });
  } catch (err) {
    console.error('Error registering for beta waitlist:', err);
    res.status(500).json({ error: err.message || 'Server error during beta registration' });
  }
});

/**
 * GET /api/beta/status
 * Retrieves current user's waitlist status and queue details
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryRes = await query('SELECT * FROM beta_waitlist WHERE user_id = $1', [userId]);

    if (entryRes.rowCount === 0) {
      return res.json({
        registered: false,
        status: 'UNREGISTERED',
        message: 'You have not registered for the SwaplyOne Beta Waitlist.'
      });
    }

    const entry = entryRes.rows[0];
    const config = await betaRolloutService.getBetaConfig();

    res.json({
      registered: true,
      waitlistEntry: entry,
      config: {
        maxCapacity: config.max_capacity,
        dailyBatchSize: config.daily_batch_size,
        rolloutActive: config.rollout_active
      }
    });
  } catch (err) {
    console.error('Error fetching beta status:', err);
    res.status(500).json({ error: 'Server error fetching beta status' });
  }
});

/**
 * GET /api/beta/waitlist-position
 * Retrieves general queue length & position metrics
 */
router.get('/waitlist-position', async (req, res) => {
  try {
    const config = await betaRolloutService.getBetaConfig();
    const statsRes = await query(`
      SELECT 
        COUNT(*)::integer as total_registered,
        COUNT(*) FILTER (WHERE rollout_status = 'ACCEPTED')::integer as active_users,
        COUNT(*) FILTER (WHERE rollout_status = 'WAITING_QUEUE')::integer as queue_length,
        COUNT(*) FILTER (WHERE rollout_status = 'INVITED')::integer as pending_invites
      FROM beta_waitlist
    `);

    res.json({
      success: true,
      metrics: {
        totalRegistered: statsRes.rows[0].total_registered,
        activeUsers: statsRes.rows[0].active_users,
        queueLength: statsRes.rows[0].queue_length,
        pendingInvites: statsRes.rows[0].pending_invites,
        maxCapacity: config.max_capacity,
        dailyBatchSize: config.daily_batch_size
      }
    });
  } catch (err) {
    console.error('Error fetching waitlist metrics:', err);
    res.status(500).json({ error: 'Server error fetching waitlist metrics' });
  }
});

/**
 * POST /api/beta/cancel
 * Cancels current user's waitlist registration
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    await betaRolloutService.cancelWaitlistRegistration(req.user.id);
    res.json({ success: true, message: 'Successfully cancelled beta waitlist registration' });
  } catch (err) {
    console.error('Error cancelling beta registration:', err);
    res.status(500).json({ error: 'Server error cancelling registration' });
  }
});

/**
 * POST /api/beta/activate
 * User activation endpoint to claim beta pass (INVITED -> ACCEPTED)
 */
router.post('/activate', authenticateToken, async (req, res) => {
  try {
    const { activationCode } = req.body;
    const activatedEntry = await betaRolloutService.activateBetaUser({
      userId: req.user.id,
      activationCode
    });

    res.json({
      success: true,
      message: 'Beta account successfully activated!',
      waitlistEntry: activatedEntry
    });
  } catch (err) {
    console.error('Error activating beta pass:', err);
    res.status(400).json({ error: err.message || 'Failed to activate beta pass' });
  }
});

export default router;
