import { query } from '../db.js';
import { sendPermanentDeletionConfirmedEmail } from './emailService.js';

const activeTimers = new Map(); // userId -> Timeout object

/**
 * Executes permanent cleanup of all user data after the 5-hour grace period expires.
 * @param {number} userId 
 */
export async function executePermanentAccountCleanup(userId) {
  console.log(`🧹 Executing permanent data cleanup for User ID ${userId}...`);
  try {
    // 1. Fetch user email & username before deletion
    const userRes = await query('SELECT username, email FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user) {
      console.log(`User ID ${userId} already deleted or not found.`);
      return true;
    }

    // 2. Cascade delete all user dependencies
    await query('DELETE FROM friendships WHERE user_id = $1 OR friend_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM friend_requests WHERE sender_id = $1 OR receiver_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM blocks WHERE blocker_id = $1 OR blocked_user_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM email_verification_codes WHERE user_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM email_logs WHERE user_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM privacy_events WHERE user_id = $1 OR target_user_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM reports WHERE reporter_id = $1 OR reported_user_id = $1', [userId]).catch(() => {});
    await query('DELETE FROM calls WHERE caller_id = $1 OR receiver_id = $1', [userId]).catch(() => {});

    // 3. Update account_deletion_requests record status
    await query(`
      UPDATE account_deletion_requests 
      SET deletion_status = 'PERMANENTLY_DELETED' 
      WHERE user_id = $1 AND deletion_status = 'PENDING_DELETION'
    `, [userId]).catch(() => {});

    // 4. Delete user record
    await query('DELETE FROM users WHERE id = $1', [userId]);

    // 5. Send permanent deletion confirmation email
    if (user.email) {
      await sendPermanentDeletionConfirmedEmail(user.email, user.username).catch(err => {
        console.error('Error sending permanent deletion email:', err.message);
      });
    }

    // 6. Log admin audit event
    await query(
      'INSERT INTO admin_audit_logs (admin_id, action, target_id, details) VALUES (NULL, $1, $2, $3)',
      ['Permanent Account Deletion Completed', userId, `User @${user.username} (${user.email}) permanently deleted after 5-hour grace period.`]
    ).catch(() => {});

    activeTimers.delete(userId);
    console.log(`✅ Permanent data cleanup for User ID ${userId} completed successfully.`);
    return true;
  } catch (err) {
    console.error(`❌ Error during permanent data cleanup for User ID ${userId}:`, err);
    throw err;
  }
}

/**
 * Schedule a delayed account deletion task in memory.
 * @param {number} userId 
 * @param {Date|string} scheduledTime 
 */
export function scheduleDelayedDeletionJob(userId, scheduledTime) {
  if (activeTimers.has(userId)) {
    clearTimeout(activeTimers.get(userId));
    activeTimers.delete(userId);
  }

  const targetMs = new Date(scheduledTime).getTime();
  const nowMs = Date.now();
  const delayMs = Math.max(0, targetMs - nowMs);

  console.log(`⏱️ Scheduled permanent deletion for User ID ${userId} in ${Math.round(delayMs / 1000)} seconds.`);

  const timeoutId = setTimeout(async () => {
    try {
      await executePermanentAccountCleanup(userId);
    } catch (err) {
      console.error(`Failed scheduled deletion for User ID ${userId}:`, err);
    }
  }, delayMs);

  activeTimers.set(userId, timeoutId);
}

/**
 * Cancel a pending deletion timer.
 * @param {number} userId 
 */
export function cancelDelayedDeletionJob(userId) {
  if (activeTimers.has(userId)) {
    clearTimeout(activeTimers.get(userId));
    activeTimers.delete(userId);
    console.log(`🛑 Cancelled scheduled deletion timer for User ID ${userId}.`);
  }
}

/**
 * Scans DB on boot to resume any pending deletion jobs.
 */
export async function initAccountDeletionScheduler() {
  console.log('🔄 Initializing Account Deletion Scheduler...');
  try {
    const res = await query(`
      SELECT user_id, scheduled_deletion_at 
      FROM account_deletion_requests 
      WHERE deletion_status = 'PENDING_DELETION'
    `);

    for (const row of res.rows) {
      const { user_id, scheduled_deletion_at } = row;
      if (new Date(scheduled_deletion_at).getTime() <= Date.now()) {
        await executePermanentAccountCleanup(user_id);
      } else {
        scheduleDelayedDeletionJob(user_id, scheduled_deletion_at);
      }
    }
    console.log(`✅ Account Deletion Scheduler initialized with ${res.rows.length} pending jobs.`);
  } catch (err) {
    console.error('❌ Failed to initialize Account Deletion Scheduler:', err.message);
  }
}
