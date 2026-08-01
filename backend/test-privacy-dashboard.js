import pg from 'pg';
import jwt from 'jsonwebtoken';
import express from 'express';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import privacyRoutes from './routes/privacyRoutes.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const TEST_PORT = 5999;

async function runDashboardTest() {
  console.log('Starting Swaply Privacy Admin Dashboard Tests...');
  let serverInstance = null;
  let passed = true;

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);

    serverInstance = app.listen(TEST_PORT);

    // Seed mock admin and offender users
    await query('DELETE FROM admin_audit_logs');
    await query('DELETE FROM privacy_events');
    await query('DELETE FROM friendships');
    await query('DELETE FROM calls');
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['adminuser', 'offender']);

    const adminRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, is_admin, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Admin', 'adminuser', 'admin@swaply.com', 'password123', 'SWP-ADMIN', true, true]
    );
    const adminId = adminRes.rows[0].id;

    const offenderRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Offender', 'offender', 'offender@swaply.com', 'password123', 'SWP-OFFEND', true]
    );
    const offenderId = offenderRes.rows[0].id;

    const callSessionId = 'session_dashboard_test';
    const callRes = await query(
      "INSERT INTO calls (caller_id, receiver_id, session_id, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
      [offenderId, adminId, callSessionId]
    );
    const dbCallId = callRes.rows[0].id;

    // Log a privacy event
    const eventRes = await query(
      `INSERT INTO privacy_events (event_type, user_id, call_id, target_user_id, beta_id_snapshot, platform, browser, severity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      ['screenshot_attempt', offenderId, dbCallId, adminId, 'SWP-OFFEND', 'web', 'Chrome', 'warning', 'NEW']
    );
    const eventId = eventRes.rows[0].id;

    const token = jwt.sign({ id: adminId, username: 'adminuser' }, JWT_SECRET);

    // 1. Fetch incidents as admin (Module 15)
    const incidentsRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/admin/incidents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const incidentsBody = await incidentsRes.json();
    if (incidentsRes.status !== 200 || !incidentsBody.success || incidentsBody.incidents.length === 0) {
      throw new Error('Failed to retrieve incidents list as admin');
    }
    console.log('✅ Incidents fetched successfully by admin.');

    // 2. Update status to REVIEWED (Module 15 & 16)
    const patchRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/admin/incidents/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'REVIEWED' })
    });
    if (patchRes.status !== 200) {
      throw new Error(`Failed to update status, got ${patchRes.status}`);
    }
    console.log('✅ Incident status successfully updated to REVIEWED.');

    // 3. Log admin action (Module 16)
    const actionRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/privacy/admin/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'Restrict Beta Access',
        targetUserId: offenderId,
        details: 'Restricted beta search permissions due to screenshot activity.',
        incidentId: eventId
      })
    });
    if (actionRes.status !== 200) {
      throw new Error(`Failed to log admin action, got ${actionRes.status}`);
    }
    console.log('✅ Admin safety action restriction applied successfully.');

    // Verify audit logs exist
    const auditCheck = await query('SELECT * FROM admin_audit_logs WHERE admin_id = $1', [adminId]);
    if (auditCheck.rowCount !== 1) {
      throw new Error('Audit log was NOT written to database');
    }
    console.log('✅ Verified admin action written to admin_audit_logs table.');

  } catch (err) {
    console.error('❌ Admin Dashboard test failed:', err.message);
    passed = false;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Dashboard Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runDashboardTest();
