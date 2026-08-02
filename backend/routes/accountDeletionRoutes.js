import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { scheduleDelayedDeletionJob, cancelDelayedDeletionJob } from '../services/accountDeletionService.js';
import { sendAccountDeletionRequestedEmail, sendAccountRestoredEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/account/delete/request
 * Schedules account deletion 5 hours from request time and suspends account
 */
router.post('/request', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { password, reason } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password confirmation is required to request account deletion' });
  }

  try {
    // 1. Fetch user password hash and current status
    const userRes = await query('SELECT username, email, password_hash, deletion_status FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.deletion_status === 'PENDING_DELETION') {
      return res.status(400).json({ error: 'Account deletion is already requested and pending' });
    }

    // 2. Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid password confirmation' });
    }

    // 3. Calculate 5-hour grace window
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const newSecurityId = `sec_deleted_${randomUUID()}`;

    // 4. Update users table
    await query(`
      UPDATE users 
      SET deletion_status = 'PENDING_DELETION',
          deletion_requested_at = $1,
          scheduled_deletion_at = $2,
          deletion_reason = $3,
          security_id = $4,
          updated_at = NOW()
      WHERE id = $5
    `, [now, scheduledTime, reason || 'User requested deletion', newSecurityId, userId]);

    // 5. Insert deletion request log
    await query(`
      INSERT INTO account_deletion_requests 
        (user_id, deletion_reason, deletion_status, deletion_requested_at, scheduled_deletion_at, ip_address, user_agent)
      VALUES ($1, $2, 'PENDING_DELETION', $3, $4, $5, $6)
    `, [userId, reason || 'User requested deletion', now, scheduledTime, req.ip || '127.0.0.1', req.headers['user-agent'] || 'Unknown']);

    // 6. Schedule background job
    scheduleDelayedDeletionJob(userId, scheduledTime);

    // 7. Audit log
    await query(
      'INSERT INTO admin_audit_logs (admin_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
      [userId, 'Schedule Account Deletion', userId, `Account deletion requested. Scheduled for ${scheduledTime.toISOString()}`]
    ).catch(() => {});

    // 8. Dispatch notification email
    if (user.email) {
      await sendAccountDeletionRequestedEmail(userId, user.email, user.username, scheduledTime).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Account deletion request received. You have 5 hours to cancel and recover your account.',
      scheduled_deletion_at: scheduledTime.toISOString(),
      remaining_seconds: 5 * 60 * 60
    });
  } catch (err) {
    console.error('Error requesting account deletion:', err);
    res.status(500).json({ error: 'Server error requesting account deletion' });
  }
});

/**
 * POST /api/account/delete/cancel
 * Cancels pending deletion request and restores full account access
 */
router.post('/cancel', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password confirmation is required to recover account' });
  }

  try {
    const userRes = await query('SELECT username, email, password_hash, deletion_status FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.deletion_status !== 'PENDING_DELETION') {
      return res.status(400).json({ error: 'Account is not currently scheduled for deletion' });
    }

    // Verify password if provided
    if (password) {
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid password confirmation' });
      }
    }

    const now = new Date();
    const newSecurityId = `sec_recovered_${randomUUID()}`;

    // Update users table
    await query(`
      UPDATE users 
      SET deletion_status = 'ACTIVE',
          recovered_at = $1,
          scheduled_deletion_at = NULL,
          deletion_requested_at = NULL,
          deletion_reason = NULL,
          security_id = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [now, newSecurityId, userId]);

    // Update deletion request log
    await query(`
      UPDATE account_deletion_requests 
      SET deletion_status = 'RECOVERED',
          recovered_at = $1
      WHERE user_id = $2 AND deletion_status = 'PENDING_DELETION'
    `, [now, userId]);

    // Cancel in-memory timer
    cancelDelayedDeletionJob(userId);

    // Audit log
    await query(
      'INSERT INTO admin_audit_logs (admin_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
      [userId, 'Cancel Account Deletion', userId, `User @${user.username} cancelled scheduled account deletion.`]
    ).catch(() => {});

    // Dispatch email
    if (user.email) {
      await sendAccountRestoredEmail(userId, user.email, user.username).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Account successfully recovered! All services restored.'
    });
  } catch (err) {
    console.error('Error cancelling account deletion:', err);
    res.status(500).json({ error: 'Server error cancelling account deletion' });
  }
});

/**
 * GET /api/account/delete/status
 * Returns current deletion status and countdown metrics
 */
router.get('/status', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const userRes = await query('SELECT deletion_status, scheduled_deletion_at, deletion_requested_at FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let remainingSeconds = 0;
    if (user.deletion_status === 'PENDING_DELETION' && user.scheduled_deletion_at) {
      remainingSeconds = Math.max(0, Math.round((new Date(user.scheduled_deletion_at).getTime() - Date.now()) / 1000));
    }

    res.json({
      success: true,
      deletion_status: user.deletion_status || 'ACTIVE',
      scheduled_deletion_at: user.scheduled_deletion_at,
      deletion_requested_at: user.deletion_requested_at,
      remaining_seconds: remainingSeconds
    });
  } catch (err) {
    console.error('Error fetching account deletion status:', err);
    res.status(500).json({ error: 'Server error fetching account status' });
  }
});

export default router;
