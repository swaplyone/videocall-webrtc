import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import pool from './db.js';

const TEST_PORT = 5005;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runAdminUsersTests() {
  console.log('Starting Swaply Admin Users Moderation Tests...');
  let passed = true;

  const { default: express } = await import('express');
  const app = express();
  app.use(express.json());
  
  const { default: adminRoutes } = await import('./routes/adminRoutes.js');
  app.use('/api/admin', adminRoutes);

  const server = app.listen(TEST_PORT);

  try {
    await query('DELETE FROM admin_audit_logs');
    await query(
      "DELETE FROM users WHERE username IN ('admin_tester', 'target_beta_user') OR email IN ('admin@swaply.app', 'target@swaply.app')"
    );

    // Seed admin
    const adminRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, is_admin, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE) RETURNING id, security_id`,
      ['sec_adm_user', 'Admin Tester', 'admin_tester', 'admin@swaply.app', 'hash123']
    );
    const adminToken = jwt.sign(
      { id: adminRes.rows[0].id, username: 'admin_tester', securityId: 'sec_adm_user' },
      JWT_SECRET
    );

    // Seed target beta user
    const targetRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, email_verified, allow_requests, searchable)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE) RETURNING id, security_id`,
      ['sec_target_user', 'Target User', 'target_beta_user', 'target@swaply.app', 'hash123']
    );
    const targetUserId = targetRes.rows[0].id;

    // 1. Fetch Beta Users List (Module 18)
    const listRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/admin/beta-users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const listJson = await listRes.json();
    assert.strictEqual(listJson.success, true);
    const matchedUser = listJson.users.find(u => u.username === 'target_beta_user');
    assert.ok(matchedUser);
    assert.strictEqual(matchedUser.email_verified, true);
    console.log('✅ Fetch beta users directory list: SUCCESS');

    // 2. Suspend target user (Module 19, 23)
    const suspendRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/admin/users/${targetUserId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'suspended' })
    });
    assert.strictEqual(suspendRes.status, 200);
    console.log('✅ Suspend User API: SUCCESS');

    // Check DB online_status and security ID change
    const checkDbRes = await query('SELECT online_status, security_id FROM users WHERE id = $1', [targetUserId]);
    assert.strictEqual(checkDbRes.rows[0].online_status, 'suspended');
    assert.notStrictEqual(checkDbRes.rows[0].security_id, 'sec_target_user'); // Security ID mutated to invalidate tokens
    console.log('✅ User suspended and security_id updated: SUCCESS');

    // 3. Modify Beta Access (Module 19)
    const accessRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/admin/users/${targetUserId}/beta-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ allowRequests: false, searchable: false })
    });
    assert.strictEqual(accessRes.status, 200);
    
    // Check DB access flags
    const checkAccessRes = await query('SELECT allow_requests, searchable FROM users WHERE id = $1', [targetUserId]);
    assert.strictEqual(checkAccessRes.rows[0].allow_requests, false);
    assert.strictEqual(checkAccessRes.rows[0].searchable, false);
    console.log('✅ Disable user beta access properties: SUCCESS');

    // 4. Verify Admin Audit Logging (Module 19)
    const auditsRes = await query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC');
    assert.ok(auditsRes.rowCount >= 2);
    assert.strictEqual(auditsRes.rows[0].action, 'Modify Beta Access');
    assert.strictEqual(auditsRes.rows[1].action, 'Suspend User');
    console.log('✅ Moderation actions audit trail written to admin_audit_logs: SUCCESS');

  } catch (err) {
    console.error('❌ Admin Users Moderation Tests failed:', err.message);
    passed = false;
  } finally {
    server.close();
    await pool.end();
  }
}

runAdminUsersTests();
