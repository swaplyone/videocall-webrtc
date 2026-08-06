import { getMaintenanceState } from '../services/maintenanceService.js';

/**
 * Maintenance middleware checking if request should be blocked
 */
export async function maintenanceGuard(req, res, next) {
  // Always bypass health check, dev tools, and maintenance status routes
  if (
    req.path.startsWith('/api/maintenance') ||
    req.path.startsWith('/api/health') ||
    req.path.startsWith('/api/dev')
  ) {
    return next();
  }

  try {
    const state = await getMaintenanceState();

    if (!state.active) {
      return next();
    }

    // Check Whitelisted Admin User ID
    if (req.user && (req.user.isAdmin || state.whitelistedAdminIds.includes(req.user.id))) {
      return next();
    }

    // Check Whitelisted IP Address
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    if (state.whitelistedIps.includes(clientIp)) {
      return next();
    }

    // Read-only mode allows GET requests
    if (state.mode === 'read_only' && req.method === 'GET') {
      return next();
    }

    // Emergency Shutdown or active maintenance blocks non-whitelisted access
    return res.status(503).json({
      success: false,
      maintenance: true,
      logout: state.mode === 'emergency' || state.active,
      mode: state.mode,
      message: state.message,
      countdownSeconds: state.countdownSeconds,
      scheduledEnd: state.scheduledEnd
    });
  } catch (err) {
    next();
  }
}
