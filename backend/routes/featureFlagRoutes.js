import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { getFeatureFlags, setFeatureFlag } from '../services/featureFlagService.js';
import { logAdminAction } from '../services/auditLogService.js';
import { query } from '../db.js';

const router = express.Router();

// GET /api/feature-flags - Get all flags (Public / Authenticated)
router.get('/', async (req, res) => {
  try {
    const flags = await getFeatureFlags();
    const fullRes = await query('SELECT key, enabled, description, category, updated_at FROM feature_flags');
    return res.json({ success: true, flags, details: fullRes.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch feature flags' });
  }
});

// POST /api/feature-flags/toggle - Admin toggle flag
router.post('/toggle', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key, enabled } = req.body;
    if (!key || typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'key and boolean enabled property required' });
    }
    await setFeatureFlag(key, enabled, req.user.id);
    await logAdminAction(req.user.id, 'TOGGLE_FEATURE_FLAG', null, { key, enabled }, req.ip);
    return res.json({ success: true, message: `Feature flag '${key}' set to ${enabled}` });
  } catch (err) {
    console.error('Error setting feature flag:', err);
    return res.status(500).json({ success: false, error: 'Failed to toggle feature flag' });
  }
});

export default router;
