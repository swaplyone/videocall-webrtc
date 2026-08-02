import { query } from './db.js';
import { runDbMigrations } from './db-init.js';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';

async function resetDatabaseToCleanState() {
  console.log('🧹 Resetting database to brand-new state (preserving admin account only)...');

  try {
    await runDbMigrations();

    const adminEmail = 'founder@swaplyone.in';
    const adminUsername = 'founder';
    const adminPassword = 'lichisw@26';

    // 1. Clear auxiliary tables
    console.log('  -> Purging test friend requests, friendships, blocks, calls, reports, and privacy logs...');
    await query('DELETE FROM friend_requests');
    await query('DELETE FROM friendships');
    await query('DELETE FROM blocks');
    await query('DELETE FROM calls');
    await query('DELETE FROM reports');
    await query('DELETE FROM privacy_events');
    await query('DELETE FROM email_verification_codes');
    await query('DELETE FROM email_logs');
    await query('DELETE FROM admin_audit_logs');
    await query('DELETE FROM account_deletion_requests');
    await query('DELETE FROM beta_waitlist');

    // 2. Delete all users except founder admin
    console.log('  -> Purging all test user accounts (preserving only founder admin)...');
    const deleteUsersRes = await query(
      'DELETE FROM users WHERE email != $1 AND username != $2',
      [adminEmail, adminUsername]
    );
    console.log(`  -> Deleted ${deleteUsersRes.rowCount} test user account(s).`);

    // 3. Ensure founder / admin account is clean and active
    console.log('  -> Verifying founder admin account...');
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(adminPassword, salt);

    const adminCheck = await query('SELECT id FROM users WHERE email = $1 OR username = $2', [adminEmail, adminUsername]);

    if (adminCheck.rows.length === 0) {
      const betaId = 'SWP-FOUNDER';
      const qrToken = `qr_tok_${randomUUID()}`;
      const securityId = `sec_${randomUUID()}`;

      await query(
        `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token, qr_active, is_admin, email_verified, allow_requests, searchable, deletion_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, TRUE, TRUE, TRUE, 'ACTIVE')`,
        [securityId, 'Founder', adminUsername, adminEmail, passwordHash, betaId, qrToken]
      );
      console.log('  -> Founder administrator account created successfully!');
    } else {
      await query(
        `UPDATE users 
         SET password_hash = $1, 
             is_admin = TRUE, 
             email_verified = TRUE, 
             deletion_status = 'ACTIVE',
             deletion_requested_at = NULL,
             scheduled_deletion_at = NULL,
             recovered_at = NULL,
             deletion_reason = NULL,
             beta_id = COALESCE(beta_id, 'SWP-FOUNDER')
         WHERE email = $2 OR username = $3`,
        [passwordHash, adminEmail, adminUsername]
      );
      console.log('  -> Founder administrator account verified and restored to active state!');
    }

    // 4. Reset beta config defaults
    console.log('  -> Resetting beta rollout config defaults...');
    await query(`
      INSERT INTO beta_config (id, max_capacity, daily_batch_size, rollout_active, expiry_hours)
      VALUES (1, 150, 10, TRUE, 72)
      ON CONFLICT (id) DO UPDATE 
      SET max_capacity = 150, daily_batch_size = 10, rollout_active = TRUE, expiry_hours = 72;
    `);

    // 5. Query remaining user count
    const remainingUsers = await query('SELECT id, username, email, beta_id, is_admin, deletion_status FROM users');
    console.log('\n📊 Database Reset Complete! Current User Directory:');
    console.table(remainingUsers.rows);

  } catch (err) {
    console.error('❌ Database Reset Failed:', err);
    process.exit(1);
  }

  process.exit(0);
}

resetDatabaseToCleanState();
