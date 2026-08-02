import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Fetch system statistics (Nodes, Online state, Call logs, Flagged chats)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsersRes = await query('SELECT COUNT(*)::integer AS count FROM users');
    const onlineUsersRes = await query("SELECT COUNT(*)::integer AS count FROM users WHERE online_status = 'online'");
    const totalCallsRes = await query('SELECT COUNT(*)::integer AS count FROM calls');
    const flaggedMessagesRes = await query("SELECT COUNT(*)::integer AS count FROM messages WHERE moderation_status != 'APPROVED'");

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsersRes.rows[0].count,
        onlineUsers: onlineUsersRes.rows[0].count,
        totalCalls: totalCallsRes.rows[0].count,
        flaggedMessages: flaggedMessagesRes.rows[0].count
      }
    });
  } catch (err) {
    console.error('Error fetching admin statistics:', err);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

// 2. Fetch all abuse reports with sender and target user details
router.get('/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reportsRes = await query(`
      SELECT r.id, 
             u1.username AS reporter_username, 
             u2.username AS reported_username, 
             r.reason, 
             r.description, 
             r.status, 
             r.created_at
      FROM reports r
      JOIN users u1 ON r.reporter_id = u1.id
      JOIN users u2 ON r.reported_user_id = u2.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, reports: reportsRes.rows });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Server error fetching reports' });
  }
});

// 3. Update status of a report (PENDING, REVIEWED, ACTION_TAKEN, DISMISSED)
router.put('/reports/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status required' });
  }

  const validStatuses = ['PENDING', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED'];
  if (!validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const updateRes = await query(
      `UPDATE reports 
       SET status = $1 
       WHERE id = $2 
       RETURNING id, reporter_id, reported_user_id, reason, description, status, created_at`,
      [status.toUpperCase(), id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ success: true, report: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating report status:', err);
    res.status(500).json({ error: 'Server error updating report status' });
  }
});

/**
 * GET /api/admin/email-stats
 * Returns 24h summary metrics of email activity (Module 16)
 */
router.get('/email-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statsRes = await query(`
      SELECT 
        COUNT(*)::integer AS total,
        COUNT(*) FILTER (WHERE status = 'SENT')::integer AS sent,
        COUNT(*) FILTER (WHERE status = 'FAILED')::integer AS failed,
        COUNT(*) FILTER (WHERE email_type = 'OTP')::integer AS otp,
        COUNT(*) FILTER (WHERE email_type = 'Welcome')::integer AS welcome,
        COUNT(*) FILTER (WHERE email_type = 'Security')::integer AS security,
        COUNT(*) FILTER (WHERE email_type = 'Friend Requests')::integer AS friend_requests
      FROM email_logs
    `);
    res.json({ success: true, stats: statsRes.rows[0] });
  } catch (err) {
    console.error('Error fetching admin email stats:', err);
    res.status(500).json({ error: 'Server error fetching email stats' });
  }
});

/**
 * GET /api/admin/email-logs
 * Returns audit list of email deliveries (Module 16)
 */
router.get('/email-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logsRes = await query(`
      SELECT el.*, u.username 
      FROM email_logs el 
      LEFT JOIN users u ON el.user_id = u.id 
      ORDER BY el.created_at DESC
    `);
    res.json({ success: true, logs: logsRes.rows });
  } catch (err) {
    console.error('Error fetching admin email logs:', err);
    res.status(500).json({ error: 'Server error fetching email logs' });
  }
});

/**
 * GET /api/admin/otp-stats
 * Returns OTP security statistics and suspicious flood alarms (Module 17)
 */
router.get('/otp-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statsRes = await query(`
      SELECT
        COUNT(*)::integer AS requests,
        COUNT(*) FILTER (WHERE used = TRUE)::integer AS successful,
        COUNT(*) FILTER (WHERE used = FALSE AND expires_at > NOW() AND attempt_count > 0)::integer AS failed,
        COUNT(*) FILTER (WHERE used = FALSE AND expires_at < NOW())::integer AS expired
      FROM email_verification_codes
    `);
    
    const suspiciousRes = await query(`
      SELECT email, COUNT(*)::integer AS requests 
      FROM email_verification_codes
      WHERE created_at >= NOW() - INTERVAL '10 minutes'
      GROUP BY email
      HAVING COUNT(*) >= 5
    `);

    res.json({ success: true, stats: statsRes.rows[0], suspicious: suspiciousRes.rows });
  } catch (err) {
    console.error('Error fetching admin OTP stats:', err);
    res.status(500).json({ error: 'Server error fetching OTP stats' });
  }
});

/**
 * GET /api/admin/beta-users
 * Returns list of beta users and associated audit metrics (Module 18)
 */
router.get('/beta-users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersRes = await query(`
      SELECT 
        u.id, u.username, u.beta_id, u.email, u.email_verified, u.created_at, u.last_seen, u.online_status,
        (SELECT COUNT(*)::integer FROM friendships WHERE user_id = u.id OR friend_id = u.id) AS friend_count,
        (SELECT COUNT(*)::integer FROM calls WHERE (caller_id = u.id OR receiver_id = u.id) AND status = 'completed') AS calls_completed,
        (SELECT COUNT(*)::integer FROM reports WHERE reported_user_id = u.id) AS report_count,
        (SELECT COUNT(*)::integer FROM privacy_events WHERE user_id = u.id) AS privacy_event_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, users: usersRes.rows });
  } catch (err) {
    console.error('Error fetching admin beta users list:', err.message);
    res.json({ success: true, users: [] });
  }
});

/**
 * POST /api/admin/users/:id/status
 * Suspends or restores account access, invalidating sessions
 */
router.post('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'suspended', 'active', or 'offline'
  if (!status || !['suspended', 'offline', 'active'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const dbStatus = status === 'active' ? 'offline' : status;

  try {
    const { randomUUID } = await import('crypto');
    const newSecurityId = `sec_admin_mod_${randomUUID()}`;

    const updateRes = await query(
      'UPDATE users SET online_status = $1, security_id = $2, updated_at = NOW() WHERE id = $3 RETURNING email',
      [dbStatus, newSecurityId, id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const email = updateRes.rows[0].email;
    if (email && dbStatus === 'suspended') {
      const { sendSecurityAlert } = await import('../services/emailService.js');
      await sendSecurityAlert(id, email, 'Account Suspended', 'Your beta tester account access has been suspended due to safety reports.');
    }

    // Log admin audit event
    await query(
      'INSERT INTO admin_audit_logs (admin_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, dbStatus === 'suspended' ? 'Suspend User' : 'Restore User', id, `Updated online_status to ${dbStatus}`]
    );

    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ error: 'Server error updating user status' });
  }
});

/**
 * DELETE & POST /api/admin/users/:id
 * Permanently deletes a user account (Admin level action)
 */
const handleDeleteUserAccount = async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Delete user foreign key dependencies safely
    await query('DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1', [id]).catch(() => {});
    await query('DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1', [id]).catch(() => {});
    await query('DELETE FROM blocks WHERE blocker_id = $1 OR blocked_user_id = $1', [id]).catch(() => {});
    await query('DELETE FROM email_verification_codes WHERE user_id = $1', [id]).catch(() => {});
    await query('DELETE FROM email_logs WHERE user_id = $1', [id]).catch(() => {});
    await query('DELETE FROM privacy_events WHERE user_id = $1 OR target_user_id = $1', [id]).catch(() => {});
    await query('DELETE FROM reports WHERE reporter_id = $1 OR reported_user_id = $1', [id]).catch(() => {});
    await query('DELETE FROM calls WHERE caller_id = $1 OR receiver_id = $1', [id]).catch(() => {});

    // 2. Delete main user account
    const deleteRes = await query('DELETE FROM users WHERE id = $1 RETURNING username, email', [id]);

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { username, email } = deleteRes.rows[0];

    // Log admin audit event
    await query(
      'INSERT INTO admin_audit_logs (admin_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'Delete User Account', id, `Deleted user @${username} (${email})`]
    ).catch(() => {});

    res.json({ success: true, message: `Account @${username} has been permanently deleted.` });
  } catch (err) {
    console.error('Error deleting user account:', err);
    res.status(500).json({ error: err.message || 'Server error deleting user account' });
  }
};

router.delete('/users/:id', authenticateToken, requireAdmin, handleDeleteUserAccount);
router.post('/users/:id/delete', authenticateToken, requireAdmin, handleDeleteUserAccount);

/**
 * POST /api/admin/users/:id/beta-access
 * Restricts or restores beta request search capabilities (Module 19)
 */
router.post('/users/:id/beta-access', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { allowRequests, searchable } = req.body;

  try {
    const updateRes = await query(
      'UPDATE users SET allow_requests = $1, searchable = $2, updated_at = NOW() WHERE id = $3 RETURNING id',
      [allowRequests !== false, searchable !== false, id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const details = `Set allow_requests=${allowRequests !== false}, searchable=${searchable !== false}`;
    await query(
      'INSERT INTO admin_audit_logs (admin_id, action, target_id, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'Modify Beta Access', id, details]
    );

    res.json({ success: true, message: 'Beta access options updated successfully' });
  } catch (err) {
    console.error('Error modifying beta access options:', err);
    res.status(500).json({ error: 'Server error updating beta access options' });
  }
});

export default router;
