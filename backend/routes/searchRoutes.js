import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { logActivity } from '../services/auditLogService.js';

const router = express.Router();

// GET /api/search/global - Optimized multi-domain search with pagination
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const { q = '', domain = 'users', page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const searchTerm = `%${q.trim().toLowerCase()}%`;

    let results = [];
    let total = 0;

    // Record user recent search
    if (q.trim().length > 1) {
      await query(
        `INSERT INTO recent_searches (user_id, query) VALUES ($1, $2)`,
        [req.user.id, q.trim()]
      ).catch(() => {});
      await logActivity(req.user.id, 'SEARCH_QUERY', { query: q.trim(), domain }, req.ip);
    }

    if (domain === 'users' || domain === 'friends') {
      const countRes = await query(
        `SELECT COUNT(*) FROM users WHERE LOWER(username) LIKE $1 OR LOWER(name) LIKE $1 OR LOWER(beta_id) LIKE $1`,
        [searchTerm]
      );
      total = parseInt(countRes.rows[0].count, 10);

      const dataRes = await query(
        `SELECT id, username, name, beta_id, profile_image, online_status FROM users
         WHERE LOWER(username) LIKE $1 OR LOWER(name) LIKE $1 OR LOWER(beta_id) LIKE $1
         ORDER BY username ASC LIMIT $2 OFFSET $3`,
        [searchTerm, limitNum, offset]
      );
      results = dataRes.rows;
    } else if (domain === 'calls') {
      const countRes = await query(
        `SELECT COUNT(*) FROM calls WHERE caller_id = $1 OR receiver_id = $1`,
        [req.user.id]
      );
      total = parseInt(countRes.rows[0].count, 10);

      const dataRes = await query(
        `SELECT c.id, c.status, c.started_at, c.ended_at, c.duration, u.username as peer_name
         FROM calls c
         JOIN users u ON (CASE WHEN c.caller_id = $1 THEN c.receiver_id ELSE c.caller_id END) = u.id
         WHERE c.caller_id = $1 OR c.receiver_id = $1
         ORDER BY c.started_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limitNum, offset]
      );
      results = dataRes.rows;
    } else if (domain === 'notifications') {
      const countRes = await query(
        `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(message) LIKE $2)`,
        [req.user.id, searchTerm]
      );
      total = parseInt(countRes.rows[0].count, 10);

      const dataRes = await query(
        `SELECT id, category, title, message, read_status, created_at FROM notifications
         WHERE user_id = $1 AND (LOWER(title) LIKE $2 OR LOWER(message) LIKE $2)
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [req.user.id, searchTerm, limitNum, offset]
      );
      results = dataRes.rows;
    } else if (domain === 'incidents' && req.user.isAdmin) {
      const countRes = await query(
        `SELECT COUNT(*) FROM privacy_events WHERE LOWER(event_type) LIKE $1 OR LOWER(severity) LIKE $1`,
        [searchTerm]
      );
      total = parseInt(countRes.rows[0].count, 10);

      const dataRes = await query(
        `SELECT id, event_type, user_id, severity, status, timestamp FROM privacy_events
         WHERE LOWER(event_type) LIKE $1 OR LOWER(severity) LIKE $1
         ORDER BY timestamp DESC LIMIT $2 OFFSET $3`,
        [searchTerm, limitNum, offset]
      );
      results = dataRes.rows;
    }

    return res.json({
      success: true,
      query: q,
      domain,
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error during global search:', err);
    return res.status(500).json({ success: false, error: 'Failed to perform search' });
  }
});

// GET /api/search/suggestions - Auto-complete search suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (q.trim().length === 0) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchTerm = `${q.trim().toLowerCase()}%`;
    const resUsers = await query(
      `SELECT username, beta_id FROM users WHERE LOWER(username) LIKE $1 OR LOWER(beta_id) LIKE $1 LIMIT 5`,
      [searchTerm]
    );

    const suggestions = resUsers.rows.map(u => u.username);
    return res.json({ success: true, suggestions });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch suggestions' });
  }
});

// GET /api/search/recent - User recent searches
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const resSearches = await query(
      `SELECT DISTINCT query, MAX(created_at) as last_searched FROM recent_searches
       WHERE user_id = $1 GROUP BY query ORDER BY last_searched DESC LIMIT 5`,
      [req.user.id]
    );
    return res.json({ success: true, recent: resSearches.rows.map(r => r.query) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch recent searches' });
  }
});

export default router;
