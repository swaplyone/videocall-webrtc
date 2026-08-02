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
 * Update beta configuration parameters
 */
export async function updateBetaConfig({ max_capacity, daily_batch_size, rollout_active, expiry_hours }) {
  const config = await getBetaConfig();
  const newCap = max_capacity !== undefined ? parseInt(max_capacity) : config.max_capacity;
  const newBatch = daily_batch_size !== undefined ? parseInt(daily_batch_size) : config.daily_batch_size;
  const newActive = rollout_active !== undefined ? Boolean(rollout_active) : config.rollout_active;
  const newExpiry = expiry_hours !== undefined ? parseInt(expiry_hours) : config.expiry_hours;

  await query(
    `UPDATE beta_config 
     SET max_capacity = $1, daily_batch_size = $2, rollout_active = $3, expiry_hours = $4, updated_at = CURRENT_TIMESTAMP 
     WHERE id = 1`,
    [newCap, newBatch, newActive, newExpiry]
  );

  // Recalculate queue if capacity increased
  await recalculateWaitlistQueue();

  return getBetaConfig();
}

/**
 * Recalculates queue positions and updates user rollout statuses based on capacity limits
 */
export async function recalculateWaitlistQueue() {
  const config = await getBetaConfig();
  const maxCap = config.max_capacity;

  // 1. Fetch all waitlist users ordered by registration time
  const allRes = await query(`
    SELECT * FROM beta_waitlist 
    WHERE rollout_status NOT IN ('CANCELLED', 'REJECTED')
    ORDER BY registration_timestamp ASC
  `);
  const list = allRes.rows;

  // 2. Count occupied slots (ACCEPTED, INVITED, READY_FOR_ROLLOUT)
  const occupiedCount = list.filter(u => u.rollout_status === 'ACCEPTED' || u.rollout_status === 'INVITED' || u.rollout_status === 'READY_FOR_ROLLOUT').length;
  let availableSlots = Math.max(0, maxCap - occupiedCount);

  // 3. Update queue positions and status
  let queueIndex = 1;
  for (const entry of list) {
    if (entry.rollout_status === 'ACCEPTED' || entry.rollout_status === 'EXPIRED') {
      continue;
    }

    // Set position for users waiting or ready
    await query(
      'UPDATE beta_waitlist SET waitlist_position = $1 WHERE id = $2',
      [queueIndex, entry.id]
    );

    // If status is WAITING_QUEUE and available slots exist, promote to READY_FOR_ROLLOUT
    if (entry.rollout_status === 'WAITING_QUEUE' && availableSlots > 0 && config.rollout_active) {
      await query(
        "UPDATE beta_waitlist SET rollout_status = 'READY_FOR_ROLLOUT' WHERE id = $1",
        [entry.id]
      );
      availableSlots--;
    }

    queueIndex++;
  }

  return { success: true, total: list.length, capacity: maxCap };
}

/**
 * Registers a user for the beta waitlist
 */
export async function registerUserForWaitlist({ userId, username, email, betaId }) {
  // Check if user is already registered
  const existing = await query('SELECT * FROM beta_waitlist WHERE user_id = $1 OR email = $2', [userId, email]);
  if (existing.rowCount > 0) {
    return existing.rows[0];
  }

  // Generate unique Beta ID if missing
  const bId = betaId || `SWP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Insert entry into waitlist table
  const insertRes = await query(
    `INSERT INTO beta_waitlist (user_id, username, beta_id, email, rollout_status)
     VALUES ($1, $2, $3, $4, 'WAITING_QUEUE')
     RETURNING *`,
    [userId, username, bId, email]
  );
  const entry = insertRes.rows[0];

  // Recalculate queue to determine position and eligibility
  await recalculateWaitlistQueue();

  // Refetch updated entry
  const updatedRes = await query('SELECT * FROM beta_waitlist WHERE id = $1', [entry.id]);
  const finalEntry = updatedRes.rows[0];

  // Dispatch email notification
  try {
    if (finalEntry.rollout_status === 'READY_FOR_ROLLOUT' || finalEntry.rollout_status === 'INVITED') {
      await emailService.sendBetaInvitationEmail(
        finalEntry.user_id,
        finalEntry.email,
        finalEntry.username,
        finalEntry.beta_id,
        finalEntry.activation_code || 'SWAPLY-PASS-2026',
        finalEntry.invitation_expiry_time
      );
    } else {
      await emailService.sendBetaWaitlistConfirmationEmail(
        finalEntry.user_id,
        finalEntry.email,
        finalEntry.username,
        `#${finalEntry.waitlist_position || 1}`
      );
    }
  } catch (err) {
    console.error('Error sending beta registration email notification:', err);
  }

  return finalEntry;
}

/**
 * Prepares the daily rollout batch of users ready for admin approval / invitation dispatch
 */
export async function prepareDailyRolloutBatch() {
  const config = await getBetaConfig();
  if (!config.rollout_active) return { prepared: 0 };

  const batchSize = config.daily_batch_size;
  const currentBatchRes = await query('SELECT MAX(rollout_batch) as max_batch FROM beta_waitlist');
  const nextBatchNum = (currentBatchRes.rows[0].max_batch || 0) + 1;

  // Select top WAITING_QUEUE users up to batchSize
  const eligibleRes = await query(
    `SELECT * FROM beta_waitlist 
     WHERE rollout_status = 'WAITING_QUEUE' 
     ORDER BY waitlist_position ASC 
     LIMIT $1`,
    [batchSize]
  );

  for (const user of eligibleRes.rows) {
    await query(
      "UPDATE beta_waitlist SET rollout_status = 'READY_FOR_ROLLOUT', rollout_batch = $1 WHERE id = $2",
      [nextBatchNum, user.id]
    );
  }

  return { prepared: eligibleRes.rowCount, batchNumber: nextBatchNum };
}

/**
 * Sends official invitation pass to specified waitlist user
 */
export async function sendBetaInvitationToUser(waitlistId, adminNotes = '') {
  const config = await getBetaConfig();
  const expiryHours = config.expiry_hours || 72;
  const activationCode = `ACT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const updateRes = await query(
    `UPDATE beta_waitlist 
     SET rollout_status = 'INVITED', 
         invite_sent_time = CURRENT_TIMESTAMP, 
         invitation_expiry_time = $1, 
         activation_code = $2, 
         admin_notes = COALESCE($3, admin_notes)
     WHERE id = $4
     RETURNING *`,
    [expiryTime, activationCode, adminNotes, waitlistId]
  );

  if (updateRes.rowCount === 0) {
    throw new Error('Waitlist entry not found');
  }

  const user = updateRes.rows[0];

  // Send invitation email via email templates
  await emailService.sendBetaInvitationEmail(
    user.user_id,
    user.email,
    user.username,
    user.beta_id,
    activationCode,
    expiryTime
  );

  return user;
}

/**
 * Approves a batch of READY_FOR_ROLLOUT users and sends invitation emails
 */
export async function approveRolloutBatch(batchNumber) {
  const querySql = batchNumber
    ? `SELECT id FROM beta_waitlist WHERE rollout_status = 'READY_FOR_ROLLOUT' AND rollout_batch = $1`
    : `SELECT id FROM beta_waitlist WHERE rollout_status = 'READY_FOR_ROLLOUT'`;
  const params = batchNumber ? [batchNumber] : [];

  const readyRes = await query(querySql, params);
  const invited = [];

  for (const row of readyRes.rows) {
    const inv = await sendBetaInvitationToUser(row.id, 'Approved by admin batch rollout');
    invited.push(inv);
  }

  return { approved: invited.length, invitedUsers: invited };
}

/**
 * User activation handler: transitions user from INVITED to ACCEPTED
 */
export async function activateBetaUser({ userId, activationCode }) {
  const entryRes = await query(
    `SELECT * FROM beta_waitlist WHERE (user_id = $1 OR activation_code = $2) AND rollout_status = 'INVITED'`,
    [userId || 0, activationCode || '']
  );

  if (entryRes.rowCount === 0) {
    throw new Error('Invalid, expired, or non-existent beta invitation pass');
  }

  const entry = entryRes.rows[0];

  // Check if invitation has expired
  if (entry.invitation_expiry_time && new Date(entry.invitation_expiry_time) < new Date()) {
    await query("UPDATE beta_waitlist SET rollout_status = 'EXPIRED' WHERE id = $1", [entry.id]);
    await recalculateWaitlistQueue();
    throw new Error('Invitation pass has expired. A new slot has been allocated to the waitlist.');
  }

  // Update status to ACCEPTED
  const updatedRes = await query(
    `UPDATE beta_waitlist SET rollout_status = 'ACCEPTED' WHERE id = $1 RETURNING *`,
    [entry.id]
  );

  // Recalculate queue metrics
  await recalculateWaitlistQueue();

  // Send welcome email
  await emailService.sendBetaAcceptedEmail(entry.user_id, entry.email, entry.username, entry.beta_id);

  return updatedRes.rows[0];
}

/**
 * Background worker to automatically process expired invitations and reallocate slots
 */
export async function processExpiredInvitations() {
  const expiredRes = await query(`
    SELECT * FROM beta_waitlist 
    WHERE rollout_status = 'INVITED' 
      AND invitation_expiry_time < CURRENT_TIMESTAMP
  `);

  const expiredUsers = [];
  for (const entry of expiredRes.rows) {
    await query("UPDATE beta_waitlist SET rollout_status = 'EXPIRED' WHERE id = $1", [entry.id]);
    expiredUsers.push(entry);

    // Send expiry notification email
    try {
      await emailService.sendSecurityAlert(
        entry.user_id,
        entry.email,
        'Beta Invitation Expired',
        'Your 72-hour SwaplyOne beta invitation pass has expired. Your slot was allocated to the next waiting user.'
      );
    } catch (e) {
      console.error('Error sending expiry alert email:', e);
    }
  }

  if (expiredUsers.length > 0) {
    console.log(`[BetaRolloutService] Expired ${expiredUsers.length} invitation(s). Reallocating slots...`);
    await recalculateWaitlistQueue();
  }

  return { expiredCount: expiredUsers.length };
}

/**
 * Cancels a user waitlist registration
 */
export async function cancelWaitlistRegistration(userId) {
  const res = await query(
    `UPDATE beta_waitlist SET rollout_status = 'CANCELLED' WHERE user_id = $1 RETURNING *`,
    [userId]
  );
  if (res.rowCount > 0) {
    await recalculateWaitlistQueue();
  }
  return { success: true };
}

/**
 * Rejects a user waitlist registration (Admin action)
 */
export async function rejectWaitlistUser(waitlistId, reason = '') {
  const res = await query(
    `UPDATE beta_waitlist SET rollout_status = 'REJECTED', admin_notes = $1 WHERE id = $2 RETURNING *`,
    [reason, waitlistId]
  );
  if (res.rowCount > 0) {
    await recalculateWaitlistQueue();
  }
  return res.rows[0];
}
