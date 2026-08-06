import { query } from '../db.js';

/**
 * Log standard user activity event
 */
export async function logActivity(userId, eventType, details = {}, ipAddress = null, userAgent = null) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, event_type, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, eventType, JSON.stringify(details), ipAddress || '127.0.0.1', userAgent || null]
    );
  } catch (err) {
    console.error(`[AuditLog] Failed to log activity ${eventType}:`, err.message);
  }
}

/**
 * Log administrative action
 */
export async function logAdminAction(adminId, action, targetId = null, details = {}, ipAddress = null) {
  try {
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId || null, action, targetId || null, JSON.stringify(details), ipAddress || '127.0.0.1']
    );
  } catch (err) {
    console.error(`[AuditLog] Failed to log admin action ${action}:`, err.message);
  }
}

/**
 * Log API HTTP Request telemetry
 */
export async function logApiRequest(method, endpoint, statusCode, responseTime = 0, userId = null, ipAddress = null) {
  try {
    await query(
      `INSERT INTO api_logs (method, endpoint, status_code, response_time, user_id, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [method, endpoint, statusCode, responseTime, userId || null, ipAddress || '127.0.0.1']
    );
  } catch (err) {
    // Silent fail for telemetry to avoid crashing request lifecycle
  }
}

/**
 * Log Security Alert / Event
 */
export async function logSecurityEvent(userId, eventType, severity = 'warning', details = {}, ipAddress = null) {
  try {
    await query(
      `INSERT INTO security_logs (user_id, event_type, severity, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, eventType, severity, JSON.stringify(details), ipAddress || '127.0.0.1']
    );
  } catch (err) {
    console.error(`[AuditLog] Failed to log security event ${eventType}:`, err.message);
  }
}
