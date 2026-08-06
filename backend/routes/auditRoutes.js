import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/audit-logs - Searchable timeline across all audit logs
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { category = 'all', search = '', limit = 50, page = 1 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    let items = [];
    let totalCount = 0;

    if (category === 'admin' || category === 'all') {
      const adminRes = await query(
        `SELECT id, admin_id as user_id, action as event_type, details, ip_address, created_at, 'admin' as log_category
         FROM admin_logs
         WHERE action ILIKE $1 OR details::text ILIKE $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [`%${search}%`, limitNum, offset]
      );
      items.push(...adminRes.rows);
    }

    if (category === 'activity' || category === 'all') {
      const actRes = await query(
        `SELECT id, user_id, event_type, details, ip_address, user_agent, created_at, 'activity' as log_category
         FROM activity_logs
         WHERE event_type ILIKE $1 OR details::text ILIKE $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [`%${search}%`, limitNum, offset]
      );
      items.push(...actRes.rows);
    }

    if (category === 'security' || category === 'all') {
      const secRes = await query(
        `SELECT id, user_id, event_type, severity, details, ip_address, created_at, 'security' as log_category
         FROM security_logs
         WHERE event_type ILIKE $1 OR details::text ILIKE $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [`%${search}%`, limitNum, offset]
      );
      items.push(...secRes.rows);
    }

    if (category === 'api' || category === 'all') {
      const apiRes = await query(
        `SELECT id, user_id, endpoint as event_type, status_code, response_time, ip_address, created_at, 'api' as log_category
         FROM api_logs
         WHERE endpoint ILIKE $1
         ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [`%${search}%`, limitNum, offset]
      );
      items.push(...apiRes.rows);
    }

    // Sort combined results by created_at descending
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginatedItems = items.slice(0, limitNum);

    return res.json({
      success: true,
      logs: paginatedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: items.length
      }
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

export default router;
