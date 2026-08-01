import assert from 'assert';
import { sendSecurityAlert } from './services/emailService.js';
import pool, { query } from './db.js';

async function runEmailLogsTests() {
  console.log('Starting Swaply Email Logs Tests...');
  let passed = true;

  try {
    await query('DELETE FROM email_logs');
    await query('DELETE FROM users WHERE username = $1', ['logs_tester']);

    const { hashPassword } = await import('./utils/authUtils.js');
    const pwdHash = await hashPassword('password123');
    const userRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['sec_logs_123', 'Logs Tester', 'logs_tester', 'logs@swaply.app', pwdHash]
    );
    const userId = userRes.rows[0].id;

    // 1. Send Security alert which logs automatically (Module 15, 22)
    const result = await sendSecurityAlert(userId, 'logs@swaply.app', 'Suspicious Login', 'IP 127.0.0.1');
    assert.strictEqual(result.success, true);
    assert.ok(result.logId);

    // 2. Query logs to verify fields
    const logsRes = await query('SELECT * FROM email_logs WHERE id = $1', [result.logId]);
    assert.strictEqual(logsRes.rowCount, 1);
    
    const log = logsRes.rows[0];
    assert.strictEqual(log.user_id, userId);
    assert.strictEqual(log.recipient, 'logs@swaply.app');
    assert.strictEqual(log.email_type, 'Security');
    assert.strictEqual(log.status, 'SENT');
    assert.ok(log.created_at);
    assert.ok(log.sent_at);

    console.log('✅ Email logs saved with user references and statuses: SUCCESS');

  } catch (err) {
    console.error('❌ Email Logs Tests failed:', err.message);
    passed = false;
  } finally {
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Email Logs Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runEmailLogsTests();
