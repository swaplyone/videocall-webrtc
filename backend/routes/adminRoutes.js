import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Fetch system statistics (Nodes, Online state, Call logs, Flagged chats)
router.get('/stats', authenticateToken, async (req, res) => {
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
router.get('/reports', authenticateToken, async (req, res) => {
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
router.put('/reports/:id/status', authenticateToken, async (req, res) => {
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

export default router;
