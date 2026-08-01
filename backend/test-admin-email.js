import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import pool from './db.js';

const TEST_PORT = 5004;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runAdminEmailTests() {
  console.log('Starting Swaply Admin Email Dashboard Tests...');
  let passed = true;

  const { default: express } = await import('express');
  const app = express();
  app.use(express.json());
  
  const { default: adminRoutes } = await import('./routes/adminRoutes.js');
  app.use('/api/admin', adminRoutes);

  const server = app.listen(TEST_PORT);

  try {
    await query(
      "DELETE FROM users WHERE username IN ('regular_user', 'admin_user') OR email IN ('reg@swaply.app', 'admin@swaply.app')"
    );

    // 1. Seed user rows
    const regRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, is_admin, email_verified)
       VALUES ($1, $2, $3, $4, $5, FALSE, TRUE) RETURNING id, security_id`,
      ['sec_reg_123', 'Regular User', 'regular_user', 'reg@swaply.app', 'hash123']
    );
    const regularToken = jwt.sign(
      { id: regRes.rows[0].id, username: 'regular_user', securityId: 'sec_reg_123' },
      JWT_SECRET
    );

    const adminRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, is_admin, email_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE, TRUE) RETURNING id, security_id`,
      ['sec_adm_123', 'Admin User', 'admin_user', 'admin@swaply.app', 'hash123']
    );
    const adminToken = jwt.sign(
      { id: adminRes.rows[0].id, username: 'admin_user', securityId: 'sec_adm_123' },
      JWT_SECRET
    );

    // 2. Test Access Denial (Module 24)
    const unauthorizedRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/admin/email-stats`, {
      headers: { 'Authorization': `Bearer ${regularToken}` }
    });
    assert.strictEqual(unauthorizedRes.status, 403);
    console.log('✅ Access denied for regular users to email-stats: SUCCESS');

    // 3. Test Authorized Access (Module 16)
    const authorizedRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/admin/email-stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(authorizedRes.status, 200);
    const statsJson = await authorizedRes.json();
    assert.strictEqual(statsJson.success, true);
    assert.ok(statsJson.stats.hasOwnProperty('total'));
    assert.ok(statsJson.stats.hasOwnProperty('sent'));
    console.log('✅ Access granted to admin for email-stats: SUCCESS');

    // 4. Fetch email logs
    const logsRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/admin/email-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logsJson = await logsRes.json();
    assert.strictEqual(logsJson.success, true);
    assert.ok(Array.isArray(logsJson.logs));
    console.log('✅ Fetch email-logs by admin: SUCCESS');

  } catch (err) {
    console.error('❌ Admin Email Dashboard Tests failed:', err.message);
    passed = false;
  } finally {
    server.close();
    await pool.end();
  }
}

runAdminEmailTests();
