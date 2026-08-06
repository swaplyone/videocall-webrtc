import { query } from '../db.js';

const SYSTEM_ROLES = {
  'Super Admin': ['MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_MODERATION', 'MANAGE_ROLLOUT', 'MANAGE_SUPPORT', 'MANAGE_EMAILS', 'VIEW_ANALYTICS', 'MANAGE_CONTENT', 'MANAGE_BACKUPS', 'MANAGE_FEATURE_FLAGS', 'MANAGE_MAINTENANCE'],
  'Admin': ['MANAGE_USERS', 'MANAGE_MODERATION', 'MANAGE_SUPPORT', 'MANAGE_EMAILS', 'VIEW_ANALYTICS', 'MANAGE_CONTENT', 'MANAGE_FEATURE_FLAGS'],
  'Moderator': ['MANAGE_MODERATION', 'MANAGE_SUPPORT'],
  'Rollout Manager': ['MANAGE_ROLLOUT', 'VIEW_ANALYTICS'],
  'Support Team': ['MANAGE_SUPPORT', 'VIEW_ANALYTICS'],
  'Email Manager': ['MANAGE_EMAILS'],
  'Analytics Viewer': ['VIEW_ANALYTICS'],
  'Content Manager': ['MANAGE_CONTENT']
};

/**
 * Seed system default roles and permissions
 */
export async function seedRolesAndPermissions() {
  for (const [roleName, perms] of Object.entries(SYSTEM_ROLES)) {
    try {
      const roleRes = await query(
        `INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = $2 RETURNING id`,
        [roleName, `${roleName} default system role`]
      );
      const roleId = roleRes.rows[0].id;

      for (const permCode of perms) {
        await query(
          `INSERT INTO permissions (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING`,
          [permCode, `${permCode} system permission`]
        );
        await query(
          `INSERT INTO role_permissions (role_id, permission_code) VALUES ($1, $2) ON CONFLICT (role_id, permission_code) DO NOTHING`,
          [roleId, permCode]
        );
      }
    } catch (err) {
      // Ignore conflict
    }
  }
}

/**
 * Middleware enforcing explicit permission
 */
export function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Super Admin / standard admin bypass check
    if (req.user.isAdmin || req.user.username === 'admin' || req.user.role === 'Super Admin') {
      return next();
    }

    try {
      const resPerm = await query(
        `SELECT rp.permission_code
         FROM user_roles ur
         JOIN role_permissions rp ON ur.role_id = rp.role_id
         WHERE ur.user_id = $1 AND rp.permission_code = $2`,
        [req.user.id, permissionCode]
      );

      if (resPerm.rows.length > 0) {
        return next();
      }

      return res.status(430).json({
        success: false,
        error: `Forbidden: Permission '${permissionCode}' required`,
        requiredPermission: permissionCode
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'RBAC verification error' });
    }
  };
}
