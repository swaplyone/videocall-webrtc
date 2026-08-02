import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import * as Templates from '../services/emailTemplates.js';
import * as betaRolloutService from '../services/betaRolloutService.js';

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
router.delete('/delete-user/:id', authenticateToken, requireAdmin, handleDeleteUserAccount);
router.post('/delete-user/:id', authenticateToken, requireAdmin, handleDeleteUserAccount);

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

/**
 * GET /api/admin/deletion-requests
 * Retrieves account lifecycle deletion & recovery audit requests
 */
router.get('/deletion-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const requestsRes = await query(`
      SELECT 
        adr.id,
        adr.user_id,
        COALESCE(adr.username, u.username, 'Deleted User') AS username,
        COALESCE(adr.email, u.email, 'No Email') AS email,
        COALESCE(adr.beta_id, u.beta_id, 'N/A') AS beta_id,
        adr.deletion_reason,
        adr.deletion_status,
        adr.deletion_requested_at,
        adr.scheduled_deletion_at,
        adr.recovered_at,
        adr.ip_address,
        adr.user_agent
      FROM account_deletion_requests adr
      LEFT JOIN users u ON adr.user_id = u.id
      ORDER BY adr.deletion_requested_at DESC
      LIMIT 100
    `);
    res.json({ success: true, requests: requestsRes.rows });
  } catch (err) {
    console.error('Error fetching deletion requests:', err);
    res.json({ success: true, requests: [] });
  }
});

router.get('/email-templates/:key', authenticateToken, requireAdmin, (req, res) => {
  const { key } = req.params;
  const username = 'AlexCreator';
  const betaId = 'BETA-8821';
  const otp = '849204';

  const map = {
    '1_email_verification_otp': Templates.getEmailVerificationOTPTemplate({ username, otp, expiresInMinutes: 5 }),
    '2_welcome_to_swaplyone': Templates.getWelcomeTemplate({ username, betaId }),
    '3_beta_registration_successful': Templates.getBetaRegistrationSuccessfulTemplate({ username, betaId }),
    '4_beta_waitlist_confirmation': Templates.getBetaWaitlistConfirmationTemplate({ username, queuePosition: '#142' }),
    '5_beta_invitation': Templates.getBetaInvitationTemplate({ username, inviteCode: 'SWAPLY-PASS-2026', buttonUrl: 'https://swaply.app/register' }),
    '6_beta_accepted': Templates.getBetaAcceptedTemplate({ username, betaId }),
    '7_rollout_update': Templates.getRolloutUpdateTemplate({ username, version: 'v2.4.0', highlights: 'Enhanced WebRTC connection setup, dynamic PiP telemetry, and improved security audit logs.' }),
    '8_friend_request_received': Templates.getFriendRequestReceivedTemplate({ username, requesterName: 'Taylor Code', requesterUsername: 'taylor_code' }),
    '9_friend_request_accepted': Templates.getFriendRequestAcceptedTemplate({ username, friendName: 'Sam Design', friendUsername: 'sam_design' }),
    '10_password_reset_otp': Templates.getPasswordResetOTPTemplate({ username, otp: '392015', expiresInMinutes: 5 }),
    '11_email_change_verification': Templates.getEmailChangeVerificationTemplate({ username, otp: '710492', newEmail: 'alex.new@swaply.app' }),
    '12_new_device_login_alert': Templates.getNewDeviceLoginAlertTemplate({ username, device: 'Chrome on macOS', location: 'San Francisco, US', ip: '192.168.1.1' }),
    '13_security_alert': Templates.getSecurityAlertTemplate({ username, title: 'Security Token Rotated', details: 'Your security ID was updated following a password modification.' }),
    '14_privacy_warning': Templates.getPrivacyWarningTemplate({ username, warningType: 'Screen Capture Attempt', callId: 'call_sess_9921' }),
    '15_call_missed_notification': Templates.getCallMissedNotificationTemplate({ username, callerName: 'Morgan Smith', callerUsername: 'morgan_s' }),
    '16_call_summary': Templates.getCallSummaryTemplate({ username, peerName: 'Morgan Smith', duration: '24m 15s', callId: 'call_sess_9921' }),
    '17_account_scheduled_deletion': Templates.getAccountScheduledForDeletionTemplate({ username, scheduledDate: 'Today at 07:30 PM (5-Hour Window)' }),
    '18_account_recovery_successful': Templates.getAccountRecoverySuccessfulTemplate({ username }),
    '19_account_permanently_deleted': Templates.getAccountPermanentlyDeletedTemplate({ username }),
    '20_feature_announcement': Templates.getFeatureAnnouncementTemplate({ username, featureName: 'QR Code Direct Connect', description: 'Instant 1-on-1 peer connections via custom dynamic QR tokens.' }),
    '21_maintenance_notification': Templates.getMaintenanceNotificationTemplate({ username, scheduledTime: 'Sunday 02:00 UTC', duration: '30 Minutes', impact: 'Brief WebRTC signaling upgrade' }),
    '22_admin_announcement': Templates.getAdminAnnouncementTemplate({ username, title: 'Community Safety Guidelines Update', message: 'We have updated our platform safety protocols.' }),
    '23_beta_feedback_request': Templates.getBetaFeedbackRequestTemplate({ username, surveyUrl: 'https://swaply.app/feedback' }),
    '24_weekly_product_updates': Templates.getWeeklyProductUpdatesTemplate({ username, weekDate: 'Week 31, 2026', highlights: 'Faster connection latency and enhanced dark mode branding.' })
  };

  const html = map[key] || map['1_email_verification_otp'];
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

/**
 * GET /api/admin/beta/metrics
 * Retrieves comprehensive live beta rollout statistics
 */
router.get('/beta/metrics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = await betaRolloutService.getBetaConfig();
    const statsRes = await query(`
      SELECT 
        COUNT(*)::integer as total_registered,
        COUNT(*) FILTER (WHERE rollout_status = 'ACCEPTED')::integer as accepted_users,
        COUNT(*) FILTER (WHERE rollout_status = 'INVITED')::integer as invited_users,
        COUNT(*) FILTER (WHERE rollout_status = 'READY_FOR_ROLLOUT')::integer as ready_users,
        COUNT(*) FILTER (WHERE rollout_status = 'WAITING_QUEUE')::integer as waiting_queue,
        COUNT(*) FILTER (WHERE rollout_status = 'EXPIRED')::integer as expired_users,
        COUNT(*) FILTER (WHERE rollout_status = 'REJECTED')::integer as rejected_users,
        COUNT(*) FILTER (WHERE rollout_status = 'ACCEPTED' AND date(registration_timestamp) = CURRENT_DATE)::integer as accepted_today
      FROM beta_waitlist
    `);

    const s = statsRes.rows[0];
    const availableSlots = Math.max(0, config.max_capacity - s.accepted_users);
    const rolloutProgress = config.max_capacity > 0 ? Math.round((s.accepted_users / config.max_capacity) * 100) : 0;

    res.json({
      success: true,
      config,
      metrics: {
        totalRegistered: s.total_registered,
        acceptedUsers: s.accepted_users,
        invitedUsers: s.invited_users,
        readyUsers: s.ready_users,
        waitingQueue: s.waiting_queue,
        expiredUsers: s.expired_users,
        rejectedUsers: s.rejected_users,
        acceptedToday: s.accepted_today,
        availableSlots,
        rolloutProgress
      }
    });
  } catch (err) {
    console.error('Error fetching admin beta metrics:', err);
    res.status(500).json({ error: 'Server error fetching beta metrics' });
  }
});

/**
 * GET /api/admin/beta/users
 * Retrieves filtered list of waitlist users
 */
router.get('/beta/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'ALL', search = '' } = req.query;
    let querySql = `SELECT * FROM beta_waitlist WHERE 1=1`;
    const params = [];

    if (status !== 'ALL') {
      params.push(status);
      querySql += ` AND rollout_status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      querySql += ` AND (username ILIKE $${params.length} OR email ILIKE $${params.length} OR beta_id ILIKE $${params.length})`;
    }

    querySql += ` ORDER BY waitlist_position ASC, registration_timestamp ASC LIMIT 200`;
    const listRes = await query(querySql, params);

    res.json({ success: true, users: listRes.rows });
  } catch (err) {
    console.error('Error fetching admin beta users:', err);
    res.status(500).json({ error: 'Server error fetching beta user list' });
  }
});

/**
 * POST /api/admin/beta/controls
 * One-click control actions for admin rollout management
 */
router.post('/beta/controls', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { action, ids, batchNumber, config, waitlistId, reason } = req.body;

    if (action === 'approve_batch') {
      const result = await betaRolloutService.approveRolloutBatch(batchNumber);
      return res.json({ success: true, message: `Approved ${result.approved} user(s) in batch ${batchNumber || 'all'}`, result });
    }

    if (action === 'approve_selected' && Array.isArray(ids)) {
      let approvedCount = 0;
      for (const id of ids) {
        await betaRolloutService.sendBetaInvitationToUser(id, 'Admin manually approved user');
        approvedCount++;
      }
      return res.json({ success: true, message: `Approved ${approvedCount} selected user(s)` });
    }

    if (action === 'pause_rollout') {
      await betaRolloutService.updateBetaConfig({ rollout_active: false });
      return res.json({ success: true, message: 'Beta rollout paused' });
    }

    if (action === 'resume_rollout') {
      await betaRolloutService.updateBetaConfig({ rollout_active: true });
      return res.json({ success: true, message: 'Beta rollout resumed' });
    }

    if (action === 'update_config' && config) {
      const updated = await betaRolloutService.updateBetaConfig(config);
      return res.json({ success: true, message: 'Beta rollout configuration updated', config: updated });
    }

    if (action === 'reject_user' && waitlistId) {
      const rejected = await betaRolloutService.rejectWaitlistUser(waitlistId, reason);
      return res.json({ success: true, message: 'User waitlist registration rejected', rejected });
    }

    if (action === 'extend_invitation' && waitlistId) {
      const extHours = 48;
      await query(
        `UPDATE beta_waitlist 
         SET invitation_expiry_time = invitation_expiry_time + INTERVAL '48 hours' 
         WHERE id = $1`,
        [waitlistId]
      );
      return res.json({ success: true, message: 'Invitation extended by 48 hours' });
    }

    if (action === 'cancel_invitation' && waitlistId) {
      await query("UPDATE beta_waitlist SET rollout_status = 'CANCELLED' WHERE id = $1", [waitlistId]);
      await betaRolloutService.recalculateWaitlistQueue();
      return res.json({ success: true, message: 'Invitation cancelled and slot reallocated' });
    }

    res.status(400).json({ error: 'Unknown admin rollout control action' });
  } catch (err) {
    console.error('Error executing beta control action:', err);
    res.status(500).json({ error: err.message || 'Server error processing control action' });
  }
});

/**
 * GET /api/admin/beta/report
 * Generates downloadable CSV report of beta waitlist and rollout metrics
 */
router.get('/beta/report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const listRes = await query(`
      SELECT id, user_id, username, email, beta_id, waitlist_position, rollout_batch, rollout_status, invite_sent_time, invitation_expiry_time, registration_timestamp
      FROM beta_waitlist ORDER BY id ASC
    `);

    let csv = 'ID,User_ID,Username,Email,Beta_ID,Position,Batch,Status,Invite_Sent,Expiry_Time,Registered_At\n';
    for (const r of listRes.rows) {
      csv += `${r.id},${r.user_id},"${r.username}","${r.email}",${r.beta_id},${r.waitlist_position || ''},${r.rollout_batch || ''},${r.rollout_status},"${r.invite_sent_time || ''}","${r.invitation_expiry_time || ''}","${r.registration_timestamp}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="swaply_beta_rollout_report.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Error generating beta report:', err);
    res.status(500).json({ error: 'Server error generating report' });
  }
});

export default router;
