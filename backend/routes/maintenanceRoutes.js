import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { getMaintenanceState, updateMaintenanceState } from '../services/maintenanceService.js';
import { logAdminAction } from '../services/auditLogService.js';

const router = express.Router();

// GET /api/maintenance/status - Get maintenance state (Public)
router.get('/status', async (req, res) => {
  try {
    const state = await getMaintenanceState();
    return res.json({ success: true, state });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch maintenance status' });
  }
});

// POST /api/maintenance/update - Update maintenance state (Admin Only)
router.post('/update', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const newState = await updateMaintenanceState(req.body);
    await logAdminAction(req.user.id, 'UPDATE_MAINTENANCE_STATE', null, req.body, req.ip);

    // Emit Socket.io maintenance update if io is attached to app
    const io = req.app.get('io');
    if (io) {
      io.emit('maintenance_status_changed', newState);
    }

    return res.json({ success: true, state: newState });
  } catch (err) {
    console.error('Error updating maintenance mode:', err);
    return res.status(500).json({ success: false, error: 'Failed to update maintenance state' });
  }
});

export default router;
