import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch notifications for authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { category, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let sql = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [userId];

    if (category && category !== 'ALL') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (title ILIKE $${params.length} OR message ILIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await query(sql, params);

    const countRes = await query('SELECT COUNT(*)::integer AS unread_count FROM notifications WHERE user_id = $1 AND read_status = FALSE', [userId]);

    res.json({
      success: true,
      notifications: result.rows,
      unreadCount: countRes.rows[0]?.unread_count || 0
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/notifications/read
 * Mark notifications as read
 */
router.post('/read', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { ids, markAll } = req.body;

  try {
    if (markAll) {
      await query('UPDATE notifications SET read_status = TRUE WHERE user_id = $1', [userId]);
    } else if (Array.isArray(ids) && ids.length > 0) {
      await query('UPDATE notifications SET read_status = TRUE WHERE user_id = $1 AND id = ANY($2::int[])', [userId, ids]);
    }

    res.json({ success: true, message: 'Notifications updated' });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    res.status(500).json({ error: 'Failed to update notification read status' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const notifId = req.params.id;

  try {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notifId, userId]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * POST /api/notifications/admin-broadcast
 * Broadcast notification to all or selected users (Admin)
 */
router.post('/admin-broadcast', authenticateToken, requireAdmin, async (req, res) => {
  const { category, title, message, targetUserIds } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required' });
  }

  try {
    let userIds = targetUserIds;
    if (!userIds || userIds.length === 0) {
      const allUsers = await query('SELECT id FROM users');
      userIds = allUsers.rows.map(u => u.id);
    }

    for (const uid of userIds) {
      await query(
        'INSERT INTO notifications (user_id, category, title, message) VALUES ($1, $2, $3, $4)',
        [uid, category || 'ADMIN_ANNOUNCEMENT', title, message]
      );
    }

    res.json({ success: true, message: `Notification broadcast to ${userIds.length} user(s)` });
  } catch (err) {
    console.error('Error broadcasting notification:', err);
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});

export default router;
