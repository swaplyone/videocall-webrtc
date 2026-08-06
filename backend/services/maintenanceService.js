import { query } from '../db.js';

/**
 * Get current platform maintenance status
 */
export async function getMaintenanceState() {
  try {
    const res = await query('SELECT * FROM maintenance_state WHERE id = 1');
    if (res.rows.length === 0) {
      return {
        active: false,
        mode: 'scheduled',
        message: 'System is operational.',
        scheduledStart: null,
        scheduledEnd: null,
        countdownSeconds: 0,
        whitelistedIps: [],
        whitelistedAdminIds: []
      };
    }
    const row = res.rows[0];
    return {
      active: row.active,
      mode: row.mode,
      message: row.message,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      countdownSeconds: row.countdown_seconds,
      whitelistedIps: row.whitelisted_ips || [],
      whitelistedAdminIds: row.whitelisted_admin_ids || []
    };
  } catch (err) {
    return {
      active: false,
      mode: 'scheduled',
      message: 'System is operational.',
      whitelistedIps: [],
      whitelistedAdminIds: []
    };
  }
}

/**
 * Update maintenance state
 */
export async function updateMaintenanceState({
  active,
  mode = 'scheduled',
  message = 'System undergoes maintenance.',
  scheduledStart = null,
  scheduledEnd = null,
  countdownSeconds = 0,
  whitelistedIps = [],
  whitelistedAdminIds = []
}) {
  await query(
    `INSERT INTO maintenance_state (id, active, mode, message, scheduled_start, scheduled_end, countdown_seconds, whitelisted_ips, whitelisted_admin_ids, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       active = $1, mode = $2, message = $3, scheduled_start = $4, scheduled_end = $5, countdown_seconds = $6, whitelisted_ips = $7, whitelisted_admin_ids = $8, updated_at = CURRENT_TIMESTAMP`,
    [
      Boolean(active),
      mode,
      message,
      scheduledStart,
      scheduledEnd,
      parseInt(countdownSeconds, 10) || 0,
      JSON.stringify(whitelistedIps),
      JSON.stringify(whitelistedAdminIds)
    ]
  );
  return getMaintenanceState();
}
