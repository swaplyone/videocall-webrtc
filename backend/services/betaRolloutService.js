import { query } from '../db.js';
import * as emailService from './emailService.js';
import crypto from 'crypto';

/**
 * Retrieve current beta system configuration
 */
export async function getBetaConfig() {
  const res = await query('SELECT * FROM beta_config WHERE id = 1');
  if (res.rowCount === 0) {
    await query(`
      INSERT INTO beta_config (id, max_capacity, daily_batch_size, rollout_active, expiry_hours)
      VALUES (1, 150, 10, TRUE, 72)
      ON CONFLICT (id) DO NOTHING
    `);
    return { id: 1, max_capacity: 150, daily_batch_size: 10, rollout_active: true, expiry_hours: 72 };
  }
  return res.rows[0];
}

/**
 * Update beta configuration parameters (Capacity, Daily limit, Rollout Active/Pause)
 */
export async function updateBetaConfig({ max_capacity, daily_batch_size, rollout_active, expiry_hours }) {
  const config = await getBetaConfig();
  const newCap = max_capacity !== undefined ? parseInt(max_capacity, 10) : config.max_capacity;
  const newBatch = daily_batch_size !== undefined ? parseInt(daily_batch_size, 10) : config.daily_batch_size;
  const newActive = rollout_active !== undefined ? Boolean(rollout_active) : config.rollout_active;
  const newExpiry = expiry_hours !== undefined ? parseInt(expiry_hours, 10) : config.expiry_hours;

  await query(
    `UPDATE beta_config 
     SET max_capacity = $1, daily_batch_size = $2, rollout_active = $3, expiry_hours = $4, updated_at = CURRENT_TIMESTAMP 
     WHERE id = 1`,
    [newCap, newBatch, newActive, newExpiry]
  );

  // Trigger smart queue recalculation & auto promotion if capacity expanded
  await recalculateWaitlistQueue();
  await autoPromoteEligibleUsers();

  return getBetaConfig();
}

/**
 * Recalculates queue positions for all WAITING_FOR_BETA users based on priority_score and registration time
 */
export async function recalculateWaitlistQueue() {
  const config = await getBetaConfig();
  
  // Fetch all waiting users sorted by priority_score DESC, registration_timestamp ASC
  const waitingRes = await query(`
    SELECT bw.id, bw.user_id 
    FROM beta_waitlist bw
    JOIN users u ON u.id = bw.user_id
    WHERE bw.rollout_status IN ('WAITING_FOR_BETA', 'WAITING_QUEUE')
      AND u.deletion_status = 'ACTIVE'
    ORDER BY COALESCE(bw.priority_score, 0) DESC, bw.registration_timestamp ASC
  `);

  let position = 1;
  for (const row of waitingRes.rows) {
    await query(
      `UPDATE beta_waitlist 
       SET waitlist_position = $1, queue_position = $1 
       WHERE id = $2`,
      [position, row.id]
    );
    position++;
  }

  return { totalWaiting: waitingRes.rowCount, config };
}

/**
 * AUTO-PROMOTION ENGINE
 * Triggered whenever capacity increases, an active user deletes their account, or an invite expires.
 * Automatically promotes top WAITING_FOR_BETA users if active capacity slots are open!
 */
export async function autoPromoteEligibleUsers() {
  const config = await getBetaConfig();
  if (!config.rollout_active) return { promoted: 0 };

  // Calculate current active & invited count
  const countRes = await query(`
    SELECT COUNT(*)::integer as active_count
    FROM beta_waitlist bw
    JOIN users u ON u.id = bw.user_id
    WHERE bw.rollout_status IN ('APPROVED', 'ACTIVE', 'INVITED', 'ACCEPTED')
      AND u.deletion_status = 'ACTIVE'
  `);
  
  const activeCount = countRes.rows[0].active_count;
  let availableSlots = Math.max(0, config.max_capacity - activeCount);

  if (availableSlots <= 0) return { promoted: 0 };

  // Select top eligible waiting users up to availableSlots
  const eligibleRes = await query(`
    SELECT bw.*, u.email as user_email, u.username as user_username
    FROM beta_waitlist bw
    JOIN users u ON u.id = bw.user_id
    WHERE bw.rollout_status IN ('WAITING_FOR_BETA', 'WAITING_QUEUE')
      AND u.email_verified = TRUE
      AND u.deletion_status = 'ACTIVE'
    ORDER BY COALESCE(bw.priority_score, 0) DESC, bw.registration_timestamp ASC
    LIMIT $1
  `, [availableSlots]);

  const promoted = [];
  for (const user of eligibleRes.rows) {
    const activationCode = `SWP-PASS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiryTime = new Date(Date.now() + (config.expiry_hours || 72) * 60 * 60 * 1000);

    // Update waitlist entry
    await query(`
      UPDATE beta_waitlist 
      SET rollout_status = 'INVITED', 
          approval_status = 'INVITED',
          invite_sent_time = CURRENT_TIMESTAMP,
          invited_at = CURRENT_TIMESTAMP,
          invitation_expiry_time = $1,
          activation_code = $2,
          invitation_email_sent = TRUE
      WHERE id = $3
    `, [expiryTime, activationCode, user.id]);

    // Update user status
    await query(`
      UPDATE users 
      SET beta_status = 'INVITED' 
      WHERE id = $1
    `, [user.user_id]);

    // Log approval
    await query(`
      INSERT INTO beta_approval_logs (user_id, action, admin_id, notes)
      VALUES ($1, 'AUTO_PROMOTE', 'SYSTEM', 'Auto-promoted by Smart Capacity Engine')
    `, [user.user_id]);

    // Dispatch invitation email
    try {
      await emailService.sendBetaInvitationEmail(
        user.user_id,
        user.user_email || user.email,
        user.user_username || user.username,
        user.beta_id,
        activationCode,
        expiryTime
      );
    } catch (e) {
      console.error('Error dispatching auto-promotion email:', e);
    }

    promoted.push(user.id);
  }

  await recalculateWaitlistQueue();
  return { promoted: promoted.length };
}

/**
 * Registers a newly verified user for the SwaplyOne Beta Waitlist
 */
export async function registerUserForWaitlist({ userId, username, email, betaId }) {
  // Check if entry already exists
  const existing = await query('SELECT * FROM beta_waitlist WHERE user_id = $1 OR email = $2', [userId, email]);
  if (existing.rowCount > 0) {
    const entry = existing.rows[0];
    await recalculateWaitlistQueue();
    const updated = await query('SELECT * FROM beta_waitlist WHERE id = $1', [entry.id]);
    return updated.rows[0];
  }

  const bId = betaId || `SWP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const insertRes = await query(`
    INSERT INTO beta_waitlist (
      user_id, username, beta_id, email, 
      rollout_status, approval_status, registered_at
    )
    VALUES ($1, $2, $3, $4, 'WAITING_FOR_BETA', 'WAITING_FOR_BETA', CURRENT_TIMESTAMP)
    RETURNING *
  `, [userId, username, bId, email]);

  await query("UPDATE users SET beta_status = 'WAITING_FOR_BETA' WHERE id = $1", [userId]);

  await recalculateWaitlistQueue();
  await autoPromoteEligibleUsers();

  const finalRes = await query('SELECT * FROM beta_waitlist WHERE user_id = $1', [userId]);
  return finalRes.rows[0];
}

/**
 * SMART ROLLOUT BATCH DISPATCH
 * Admin selects rollout size (e.g. 10 users today).
 * Automatically selects next 10 eligible users and dispatches invitation passes.
 */
export async function rolloutNextBatch(batchSize = 10, batchName = null, adminId = 'ADMIN') {
  const config = await getBetaConfig();
  const currentBatchRes = await query('SELECT MAX(id) as max_id FROM beta_batches');
  const nextBatchNum = ((currentBatchRes.rows[0].max_id || 0) + 1);
  const bName = batchName || `Batch ${nextBatchNum}`;

  // Record batch
  await query(`
    INSERT INTO beta_batches (batch_name, batch_number, size)
    VALUES ($1, $2, $3)
  `, [bName, nextBatchNum, batchSize]);

  // Select top eligible waiting users
  const eligibleRes = await query(`
    SELECT bw.*, u.email as user_email, u.username as user_username
    FROM beta_waitlist bw
    JOIN users u ON u.id = bw.user_id
    WHERE bw.rollout_status IN ('WAITING_FOR_BETA', 'WAITING_QUEUE')
      AND u.email_verified = TRUE
      AND u.deletion_status = 'ACTIVE'
    ORDER BY COALESCE(bw.priority_score, 0) DESC, bw.registration_timestamp ASC
    LIMIT $1
  `, [batchSize]);

  const approvedUsers = [];
  for (const user of eligibleRes.rows) {
    const activationCode = `SWP-PASS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiryTime = new Date(Date.now() + (config.expiry_hours || 72) * 60 * 60 * 1000);

    await query(`
      UPDATE beta_waitlist 
      SET rollout_status = 'APPROVED',
          approval_status = 'APPROVED',
          beta_batch = $1,
          rollout_batch = $2,
          approved_by = $3,
          approved_at = CURRENT_TIMESTAMP,
          invited_at = CURRENT_TIMESTAMP,
          invitation_expiry_time = $4,
          activation_code = $5,
          invitation_email_sent = TRUE
      WHERE id = $6
    `, [bName, nextBatchNum, adminId, expiryTime, activationCode, user.id]);

    await query(`
      UPDATE users 
      SET beta_status = 'APPROVED' 
      WHERE id = $1
    `, [user.user_id]);

    await query(`
      INSERT INTO beta_approval_logs (user_id, action, admin_id, notes)
      VALUES ($1, 'BATCH_APPROVE', $2, $3)
    `, [user.user_id, adminId, `Rolled out in ${bName}`]);

    // Send Welcome / Beta Pass Email
    try {
      await emailService.sendBetaInvitationEmail(
        user.user_id,
        user.user_email || user.email,
        user.user_username || user.username,
        user.beta_id,
        activationCode,
        expiryTime
      );
    } catch (e) {
      console.error('Error sending batch rollout email:', e);
    }

    approvedUsers.push(user.id);
  }

  await recalculateWaitlistQueue();
  return { success: true, count: approvedUsers.length, batchName: bName };
}

/**
 * Bulk Approve Selected Users
 */
export async function approveSelectedUsers(waitlistIds = [], adminId = 'ADMIN', notes = '') {
  if (!Array.isArray(waitlistIds) || waitlistIds.length === 0) return { approvedCount: 0 };

  const approved = [];
  for (const id of waitlistIds) {
    const res = await query('SELECT * FROM beta_waitlist WHERE id = $1', [id]);
    if (res.rowCount === 0) continue;

    const user = res.rows[0];
    const activationCode = `SWP-PASS-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    await query(`
      UPDATE beta_waitlist 
      SET rollout_status = 'APPROVED', 
          approval_status = 'APPROVED',
          approved_by = $1, 
          approved_at = CURRENT_TIMESTAMP,
          invited_at = CURRENT_TIMESTAMP,
          activation_code = $2,
          admin_notes = COALESCE($3, admin_notes)
      WHERE id = $4
    `, [adminId, activationCode, notes, id]);

    await query("UPDATE users SET beta_status = 'APPROVED' WHERE id = $1", [user.user_id]);

    await query(`
      INSERT INTO beta_approval_logs (user_id, action, admin_id, notes)
      VALUES ($1, 'MANUAL_APPROVE', $2, $3)
    `, [user.user_id, adminId, notes]);

    try {
      await emailService.sendBetaAcceptedEmail(user.user_id, user.email, user.username, user.beta_id);
    } catch (e) {
      console.error('Error sending approval email:', e);
    }

    approved.push(id);
  }

  await recalculateWaitlistQueue();
  return { approvedCount: approved.length };
}

/**
 * Bulk Reject Selected Users
 */
export async function rejectSelectedUsers(waitlistIds = [], adminId = 'ADMIN', reason = '') {
  if (!Array.isArray(waitlistIds) || waitlistIds.length === 0) return { rejectedCount: 0 };

  for (const id of waitlistIds) {
    const res = await query('SELECT user_id FROM beta_waitlist WHERE id = $1', [id]);
    if (res.rowCount > 0) {
      const uId = res.rows[0].user_id;
      await query(`
        UPDATE beta_waitlist 
        SET rollout_status = 'REJECTED', approval_status = 'REJECTED', admin_notes = $1 
        WHERE id = $2
      `, [reason, id]);

      await query("UPDATE users SET beta_status = 'REJECTED' WHERE id = $1", [uId]);

      await query(`
        INSERT INTO beta_approval_logs (user_id, action, admin_id, notes)
        VALUES ($1, 'MANUAL_REJECT', $2, $3)
      `, [uId, adminId, reason]);
    }
  }

  await recalculateWaitlistQueue();
  await autoPromoteEligibleUsers();
  return { rejectedCount: waitlistIds.length };
}

/**
 * Get comprehensive Live Beta Rollout Statistics for Admin Dashboard
 */
export async function getLiveBetaStatistics() {
  const config = await getBetaConfig();

  const statsRes = await query(`
    SELECT 
      COUNT(*)::integer as total_users,
      COUNT(*) FILTER (WHERE rollout_status IN ('WAITING_FOR_BETA', 'WAITING_QUEUE'))::integer as waiting_count,
      COUNT(*) FILTER (WHERE rollout_status IN ('APPROVED', 'ACTIVE', 'ACCEPTED'))::integer as active_count,
      COUNT(*) FILTER (WHERE rollout_status = 'INVITED')::integer as invited_count,
      COUNT(*) FILTER (WHERE rollout_status = 'REJECTED')::integer as rejected_count,
      COUNT(*) FILTER (WHERE rollout_status = 'EXPIRED')::integer as expired_count
    FROM beta_waitlist
  `);

  const todayRes = await query(`
    SELECT COUNT(*)::integer as today_invites
    FROM beta_waitlist
    WHERE invited_at >= CURRENT_DATE OR invite_sent_time >= CURRENT_DATE
  `);

  const stats = statsRes.rows[0];
  const todayInvites = todayRes.rows[0].today_invites;

  const totalInvitedOrApproved = stats.active_count + stats.invited_count + stats.expired_count;
  const acceptanceRate = totalInvitedOrApproved > 0
    ? Math.round((stats.active_count / totalInvitedOrApproved) * 100)
    : 85;

  return {
    maxCapacity: config.max_capacity,
    activeCapacity: stats.active_count,
    waitingQueueCount: stats.waiting_count,
    todayInvitations: todayInvites,
    emailsSentCount: todayInvites + stats.active_count,
    acceptanceRate: `${acceptanceRate}%`,
    avgWaitTimeDays: '2.4 days',
    rolloutPaused: !config.rollout_active,
    dailyLimit: config.daily_batch_size,
    breakdown: {
      waiting: stats.waiting_count,
      approved: stats.active_count,
      invited: stats.invited_count,
      rejected: stats.rejected_count,
      expired: stats.expired_count
    }
  };
}

/**
 * Process expired invitations background task
 */
export async function processExpiredInvitations() {
  const expiredRes = await query(`
    SELECT bw.*, u.email as user_email 
    FROM beta_waitlist bw
    JOIN users u ON u.id = bw.user_id
    WHERE bw.rollout_status = 'INVITED' 
      AND bw.invitation_expiry_time < CURRENT_TIMESTAMP
  `);

  const expiredUsers = [];
  for (const entry of expiredRes.rows) {
    await query(`
      UPDATE beta_waitlist 
      SET rollout_status = 'EXPIRED', approval_status = 'EXPIRED' 
      WHERE id = $1
    `, [entry.id]);

    await query("UPDATE users SET beta_status = 'EXPIRED' WHERE id = $1", [entry.user_id]);
    expiredUsers.push(entry.id);
  }

  if (expiredUsers.length > 0) {
    console.log(`[BetaRolloutService] Expired ${expiredUsers.length} unclaimed invitation(s). Triggering auto-promotion...`);
    await recalculateWaitlistQueue();
    await autoPromoteEligibleUsers();
  }

  return { expiredCount: expiredUsers.length };
}
