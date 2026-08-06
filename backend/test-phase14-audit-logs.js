import assert from 'assert';
import { logActivity, logAdminAction, logSecurityEvent } from './services/auditLogService.js';
import { query } from './db.js';

console.log('🧪 Starting Phase 14 Suite: Logging & Audit Trail...');

async function runTest() {
  try {
    const userRes = await query('SELECT id FROM users LIMIT 1');
    const userId = userRes.rows[0]?.id || 1;

    // 1. Log activity
    await logActivity(userId, 'TEST_LOGIN_EVENT', { browser: 'Chrome' }, '127.0.0.1');

    // 2. Log admin action
    await logAdminAction(userId, 'TEST_ADMIN_ACTION', null, { target: 'user' }, '127.0.0.1');

    // 3. Log security event
    await logSecurityEvent(userId, 'TEST_SECURITY_ALERT', 'warning', { reason: 'suspicious' }, '127.0.0.1');

    // Verify DB entries
    const actRes = await query('SELECT * FROM activity_logs WHERE event_type = $1', ['TEST_LOGIN_EVENT']);
    assert(actRes.rows.length > 0, 'Activity log missing');

    const adminRes = await query('SELECT * FROM admin_logs WHERE action = $1', ['TEST_ADMIN_ACTION']);
    assert(adminRes.rows.length > 0, 'Admin log missing');

    const secRes = await query('SELECT * FROM security_logs WHERE event_type = $1', ['TEST_SECURITY_ALERT']);
    assert(secRes.rows.length > 0, 'Security log missing');

    console.log('✅ Phase 14 Logging & Audit Trail tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Audit Trail test FAILED:', err);
    process.exit(1);
  }
}

runTest();
