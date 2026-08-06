import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
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
 * Retrieves user's waitlist status, queue position, estimated invitation days, and capacity metrics for Waiting Page
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // First ensure waitlist entry exists
    const userRes = await query('SELECT id, name, username, email, beta_id, beta_status FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    let entryRes = await query('SELECT * FROM beta_waitlist WHERE user_id = $1', [userId]);
    let entry = entryRes.rowCount > 0 ? entryRes.rows[0] : null;

    if (!entry) {
      entry = await betaRolloutService.registerUserForWaitlist({
        userId: user.id,
        username: user.username,
        email: user.email,
        betaId: user.beta_id
      });
    }

    const stats = await betaRolloutService.getLiveBetaStatistics();
    const config = await betaRolloutService.getBetaConfig();

    // Estimate wait time based on queue position and daily limit
    const pos = entry.queue_position || entry.waitlist_position || 1;
    const dailyLimit = config.daily_batch_size || 10;
    const estDaysMin = Math.max(1, Math.floor(pos / dailyLimit));
    const estDaysMax = estDaysMin + 2;

    res.json({
      success: true,
      userStatus: user.beta_status || entry.rollout_status || 'WAITING_FOR_BETA',
      queuePosition: pos,
      capacity: {
        current: stats.activeCapacity,
        max: config.max_capacity,
        full: stats.activeCapacity >= config.max_capacity
      },
      estimatedInvitation: `${estDaysMin}–${estDaysMax} days`,
      betaId: user.beta_id,
      waitlistEntry: entry,
      stats
    });
  } catch (err) {
    console.error('Error fetching beta status:', err);
    res.status(500).json({ error: 'Server error fetching beta status' });
  }
});

/**
 * POST /api/beta/notify
 * Saves user email notification preference on Waiting Page
 */
router.post('/notify', authenticateToken, async (req, res) => {
  try {
    await query("UPDATE beta_waitlist SET admin_notes = COALESCE(admin_notes, '') || ' [Notify Requested]' WHERE user_id = $1", [req.user.id]);
    res.json({ success: true, message: 'You will receive an email notification as soon as your slot opens!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record notification preference' });
  }
});

/**
 * GET /api/beta/admin-list (ADMIN ONLY)
 * Paginated, searchable, sortable list of all beta waitlist users by filter status
 */
router.get('/admin-list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { filter = 'all', search = '', page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let whereClause = "WHERE u.deletion_status = 'ACTIVE'";
    const params = [];

    if (filter !== 'all') {
      params.push(filter.toUpperCase());
      whereClause += ` AND UPPER(bw.rollout_status) = $${params.length}`;
    }

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(bw.username) LIKE $${params.length} OR LOWER(bw.email) LIKE $${params.length} OR LOWER(bw.beta_id) LIKE $${params.length})`;
    }

    const countSql = `
      SELECT COUNT(*)::integer as total 
      FROM beta_waitlist bw
      JOIN users u ON u.id = bw.user_id
      ${whereClause}
    `;
    const countRes = await query(countSql, params);

    params.push(parseInt(limit, 10), offset);
    const dataSql = `
      SELECT 
        bw.id,
        bw.user_id,
        bw.username,
        bw.email,
        bw.beta_id,
        bw.registration_timestamp as registered_at,
        bw.queue_position,
        bw.waitlist_position,
        bw.priority_score,
        bw.rollout_status,
        bw.approval_status,
        bw.approved_by,
        bw.approved_at,
        bw.invited_at,
        bw.invitation_email_sent,
        bw.beta_batch,
        u.email_verified,
        u.profile_image
      FROM beta_waitlist bw
      JOIN users u ON u.id = bw.user_id
      ${whereClause}
      ORDER BY 
        CASE WHEN bw.rollout_status IN ('WAITING_FOR_BETA', 'WAITING_QUEUE') THEN 0 ELSE 1 END,
        COALESCE(bw.queue_position, 999999) ASC,
        bw.registration_timestamp ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const dataRes = await query(dataSql, params);
    const stats = await betaRolloutService.getLiveBetaStatistics();

    res.json({
      success: true,
      total: countRes.rows[0].total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      users: dataRes.rows,
      stats
    });
  } catch (err) {
    console.error('Error fetching admin beta list:', err);
    res.status(500).json({ error: 'Server error fetching beta admin list' });
  }
});

/**
 * POST /api/beta/rollout-batch (ADMIN ONLY)
 * Rolls out the next N eligible users in a new batch
 */
router.post('/rollout-batch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { batchSize = 10, batchName } = req.body;
    const result = await betaRolloutService.rolloutNextBatch(parseInt(batchSize, 10), batchName, req.user.username || 'ADMIN');
    res.json({ success: true, message: `Successfully rolled out ${result.count} users in ${result.batchName}`, result });
  } catch (err) {
    console.error('Error executing rollout batch:', err);
    res.status(500).json({ error: err.message || 'Failed to execute rollout batch' });
  }
});

/**
 * POST /api/beta/bulk-approve (ADMIN ONLY)
 */
router.post('/bulk-approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { waitlistIds, notes } = req.body;
    const result = await betaRolloutService.approveSelectedUsers(waitlistIds, req.user.username || 'ADMIN', notes);
    res.json({ success: true, message: `Approved ${result.approvedCount} users`, result });
  } catch (err) {
    console.error('Error bulk approving users:', err);
    res.status(500).json({ error: 'Failed to approve selected users' });
  }
});

/**
 * POST /api/beta/bulk-reject (ADMIN ONLY)
 */
router.post('/bulk-reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { waitlistIds, reason } = req.body;
    const result = await betaRolloutService.rejectSelectedUsers(waitlistIds, req.user.username || 'ADMIN', reason);
    res.json({ success: true, message: `Rejected ${result.rejectedCount} users`, result });
  } catch (err) {
    console.error('Error bulk rejecting users:', err);
    res.status(500).json({ error: 'Failed to reject selected users' });
  }
});

/**
 * POST /api/beta/config (ADMIN ONLY)
 * Updates beta capacity, daily limit, or pauses/resumes rollout
 */
router.post('/config', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { maxCapacity, dailyLimit, rolloutActive } = req.body;
    const updatedConfig = await betaRolloutService.updateBetaConfig({
      max_capacity: maxCapacity,
      daily_batch_size: dailyLimit,
      rollout_active: rolloutActive
    });
    res.json({ success: true, message: 'Beta configuration updated successfully', config: updatedConfig });
  } catch (err) {
    console.error('Error updating beta config:', err);
    res.status(500).json({ error: 'Failed to update beta config' });
  }
});

/**
 * GET /api/beta/export-csv (ADMIN ONLY)
 * Exports the beta waitlist queue as CSV format
 */
router.get('/export-csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const dataRes = await query(`
      SELECT 
        bw.queue_position,
        bw.username,
        bw.email,
        bw.beta_id,
        bw.rollout_status,
        bw.priority_score,
        bw.registration_timestamp
      FROM beta_waitlist bw
      ORDER BY COALESCE(bw.queue_position, 999999) ASC
    `);

    let csv = 'Queue Position,Username,Email,Beta ID,Status,Priority Score,Registration Timestamp\n';
    for (const r of dataRes.rows) {
      csv += `"${r.queue_position || ''}","${r.username}","${r.email}","${r.beta_id}","${r.rollout_status}","${r.priority_score || 0}","${r.registration_timestamp}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="swaply_beta_queue.csv"');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

export default router;
