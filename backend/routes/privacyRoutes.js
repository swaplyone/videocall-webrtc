import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const APPROVED_EVENT_TYPES = [
  'screenshot_attempt',
  'capture_risk',
  'screen_capture_detected',
  'screen_share_detected',
  'privacy_warning'
];

// 1. Log Privacy Event (Module 4, 9, 21)
router.post('/events', authenticateToken, async (req, res) => {
  const { eventType, callId, browser, platform, metadata } = req.body;

  // Validate request payload size
  if (JSON.stringify(req.body).length > 4096) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  if (!eventType || !callId) {
    return res.status(400).json({ error: 'Event type and Call ID are required' });
  }

  if (!APPROVED_EVENT_TYPES.includes(eventType)) {
    return res.status(400).json({ error: 'Invalid or unapproved event type' });
  }

  try {
    // 1. Validate Call session and Membership (Module 21)
    const callRes = await query(
      'SELECT id, caller_id, receiver_id FROM calls WHERE session_id = $1',
      [callId]
    );

    if (callRes.rowCount === 0) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    const callRow = callRes.rows[0];
    const dbCallId = callRow.id;
    const isCaller = callRow.caller_id === req.user.id;
    const isReceiver = callRow.receiver_id === req.user.id;

    if (!isCaller && !isReceiver) {
      return res.status(403).json({ error: 'Access denied: You are not a participant of this call' });
    }

    const targetUserId = isCaller ? callRow.receiver_id : callRow.caller_id;

    // Fetch user beta ID for snapshot
    const userRes = await query('SELECT beta_id FROM users WHERE id = $1', [req.user.id]);
    const betaIdSnapshot = userRes.rowCount > 0 ? userRes.rows[0].beta_id : 'SWP-BETA';

    // 2. Enforce backend-side rate limiting (Module 9)
    const rateCheck = await query(
      `SELECT COUNT(*) FROM privacy_events 
       WHERE user_id = $1 AND call_id = $2 AND timestamp > NOW() - INTERVAL '1 minute'`,
      [req.user.id, dbCallId]
    );
    const eventCount = parseInt(rateCheck.rows[0].count, 10);

    if (eventCount >= 5) {
      // Log separate rate limit incident if not already logged recently
      const existsAbuse = await query(
        `SELECT 1 FROM privacy_events 
         WHERE user_id = $1 AND call_id = $2 AND event_type = 'privacy_event_rate_limited' AND timestamp > NOW() - INTERVAL '1 minute'`,
        [req.user.id, dbCallId]
      );
      if (existsAbuse.rowCount === 0) {
        await query(
          `INSERT INTO privacy_events (event_type, user_id, call_id, target_user_id, beta_id_snapshot, severity, status, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            'privacy_event_rate_limited',
            req.user.id,
            dbCallId,
            targetUserId,
            betaIdSnapshot,
            'critical',
            'NEW',
            JSON.stringify({ message: 'Client flooded 5+ capture events in 60s window' })
          ]
        );
      }
      return res.status(429).json({ error: 'Capture events rate limit exceeded' });
    }

    // 3. Insert Privacy Event
    const cleanMeta = metadata ? JSON.parse(JSON.stringify(metadata)) : {};
    const severity = eventType === 'screenshot_attempt' ? 'warning' : 'warning';

    const insertRes = await query(
      `INSERT INTO privacy_events (event_type, user_id, call_id, target_user_id, beta_id_snapshot, platform, browser, severity, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        eventType,
        req.user.id,
        dbCallId,
        targetUserId,
        betaIdSnapshot,
        platform || 'web',
        browser || 'unknown',
        severity,
        'NEW',
        JSON.stringify(cleanMeta)
      ]
    );

    const io = req.app.get('socketio');
    if (io) {
      io.to('admins').emit('admin_privacy_event', {
        id: insertRes.rows[0].id,
        eventType,
        userId: req.user.id,
        targetUserId,
        severity,
        status: 'NEW'
      });
    }

    res.json({
      success: true,
      message: 'Privacy event logged successfully',
      eventId: insertRes.rows[0].id
    });
  } catch (err) {
    console.error('Error handling privacy event endpoint:', err);
    res.status(500).json({ error: 'Server error logging event' });
  }
});

// 2. Fetch Privacy Events (Admin only) (Module 14)
router.get('/admin/incidents', authenticateToken, async (req, res) => {
  // Validate admin permissions
  const userCheck = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
  if (userCheck.rowCount === 0 || !userCheck.rows[0].is_admin) {
    return res.status(403).json({ error: 'Access denied: Admin permissions required' });
  }

  const { status, severity } = req.query;

  try {
    let sql = `
      SELECT pe.*, 
             u.username as offender_username,
             tu.username as victim_username,
             c.session_id as call_session_id
      FROM privacy_events pe
      LEFT JOIN users u ON pe.user_id = u.id
      LEFT JOIN users tu ON pe.target_user_id = tu.id
      LEFT JOIN calls c ON pe.call_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND pe.status = $${params.length}`;
    }

    if (severity && severity !== 'All') {
      params.push(severity);
      sql += ` AND pe.severity = $${params.length}`;
    }

    sql += ' ORDER BY pe.timestamp DESC';

    const incidents = await query(sql, params);
    res.json({ success: true, incidents: incidents.rows });
  } catch (err) {
    console.error('Error fetching admin incidents:', err);
    res.status(500).json({ error: 'Server error fetching incidents' });
  }
});

// 3. Update Privacy Event Status (Admin only) (Module 15)
router.patch('/admin/incidents/:id', authenticateToken, async (req, res) => {
  // Validate admin permissions
  const userCheck = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
  if (userCheck.rowCount === 0 || !userCheck.rows[0].is_admin) {
    return res.status(403).json({ error: 'Access denied: Admin permissions required' });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['NEW', 'REVIEWED', 'RESOLVED', 'ESCALATED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid or missing status value' });
  }

  try {
    const updateRes = await query(
      'UPDATE privacy_events SET status = $1 WHERE id = $2 RETURNING id',
      [status, id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ success: true, message: 'Incident status updated successfully' });
  } catch (err) {
    console.error('Error updating incident status:', err);
    res.status(500).json({ error: 'Server error updating status' });
  }
});

// 4. Submit Admin Safety Action (Module 16)
router.post('/admin/action', authenticateToken, async (req, res) => {
  // Validate admin permissions
  const userCheck = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
  if (userCheck.rowCount === 0 || !userCheck.rows[0].is_admin) {
    return res.status(403).json({ error: 'Access denied: Admin permissions required' });
  }

  const { action, targetUserId, details, incidentId } = req.body;

  if (!action) {
    return res.status(400).json({ error: 'Action is required' });
  }

  try {
    // 1. Perform database state updates based on action type
    if (action === 'Restrict Beta Access') {
      await query(
        'UPDATE users SET searchable = false, allow_requests = false WHERE id = $1',
        [targetUserId]
      );
    } else if (action === 'Suspend User') {
      await query(
        "UPDATE users SET online_status = 'offline' WHERE id = $1",
        [targetUserId]
      );
    }

    // 2. Write to admin_audit_logs (Module 16)
    await query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, details)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, action, targetUserId || null, details || `Admin action performed for incident #${incidentId}`]
    );

    res.json({ success: true, message: `Admin action '${action}' processed and logged successfully` });
  } catch (err) {
    console.error('Error processing admin action:', err);
    res.status(500).json({ error: 'Server error processing action' });
  }
});

export default router;
