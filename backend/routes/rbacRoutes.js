import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { seedRolesAndPermissions } from '../middleware/rbacMiddleware.js';
import { logAdminAction } from '../services/auditLogService.js';

const router = express.Router();

// GET /api/rbac/roles - List all roles & permissions
router.get('/roles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await seedRolesAndPermissions();
    const rolesRes = await query('SELECT * FROM roles ORDER BY id');
    const permsRes = await query('SELECT * FROM permissions ORDER BY id');
    const rolePermsRes = await query('SELECT * FROM role_permissions');

    const rolePermMap = {};
    rolePermsRes.rows.forEach(rp => {
      if (!rolePermMap[rp.role_id]) rolePermMap[rp.role_id] = [];
      rolePermMap[rp.role_id].push(rp.permission_code);
    });

    const roles = rolesRes.rows.map(r => ({
      ...r,
      permissions: rolePermMap[r.id] || []
    }));

    return res.json({ success: true, roles, permissions: permsRes.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch roles and permissions' });
  }
});

// POST /api/rbac/assign - Assign role to user
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    if (!userId || !roleId) {
      return res.status(400).json({ success: false, error: 'userId and roleId required' });
    }

    await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
    await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    await logAdminAction(req.user.id, 'ASSIGN_ROLE', userId, { roleId }, req.ip);

    return res.json({ success: true, message: `Role ${roleId} assigned to user ${userId}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to assign role' });
  }
});

export default router;
