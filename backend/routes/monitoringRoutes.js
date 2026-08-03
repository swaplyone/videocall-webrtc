import express from 'express';
import os from 'os';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/monitoring/health
 * Live Monitoring & Server Health Metrics
 */
router.get('/health', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = Math.round((usedMem / totalMem) * 100);

    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const uptimeSeconds = Math.round(os.uptime());

    // Database metrics
    const userStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE online_status IN ('online', 'away', 'busy', 'in_call'))::integer AS active_users,
        COUNT(*)::integer AS total_users
      FROM users
    `);

    const callStats = await query(`
      SELECT COUNT(*) FILTER (WHERE status = 'ongoing')::integer AS active_calls
      FROM calls
    `);

    // Check DB query health
    let dbStatus = 'healthy';
    try {
      await query('SELECT 1');
    } catch (e) {
      dbStatus = 'degraded';
    }

    res.json({
      success: true,
      health: {
        serverStatus: 'OPERATIONAL',
        uptimeSeconds,
        cpu: {
          cores: cpus.length,
          model: cpus[0]?.model || 'Generic CPU',
          loadAverage: loadAvg
        },
        memory: {
          totalMB: Math.round(totalMem / (1024 * 1024)),
          usedMB: Math.round(usedMem / (1024 * 1024)),
          freeMB: Math.round(freeMem / (1024 * 1024)),
          usagePercent: memoryUsagePercent
        },
        activeUsers: userStats.rows[0]?.active_users || 0,
        totalUsers: userStats.rows[0]?.total_users || 0,
        activeCalls: callStats.rows[0]?.active_calls || 0,
        database: dbStatus,
        smtp: 'ready_fallback',
        webrtcSignaling: 'operational',
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Error retrieving monitoring metrics:', err);
    res.status(500).json({ error: 'Failed to retrieve server monitoring telemetry' });
  }
});

export default router;
