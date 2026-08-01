import assert from 'assert';
import { validateConnection, sendWelcomeEmail } from './services/emailService.js';
import pool, { query } from './db.js';

async function runEmailServiceTest() {
  console.log('Starting Swaply Email Service Tests...');
  let passed = true;

  try {
    // 1. Verify Connection Validation (Module 2)
    const connCheck = await validateConnection();
    assert.strictEqual(connCheck.success, true);
    console.log('✅ Connection verification: SUCCESS');

    // Seed mock user for reference
    await query('DELETE FROM email_logs');
    await query('DELETE FROM users WHERE username = $1', ['test_email_user']);
    
    // We insert a dummy user to satisfy database constraints if we test logging
    const userRes = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['test_sec_id_123', 'Test User', 'test_email_user', 'test@swaply.app', 'hash123']
    );
    const userId = userRes.rows[0].id;

    // 2. Dispatch a Welcome Email and verify logging (Module 15)
    const dispatchRes = await sendWelcomeEmail(userId, 'test@swaply.app', 'SWP-TEST1');
    assert.strictEqual(dispatchRes.success, true);
    assert.ok(dispatchRes.logId);
    console.log('✅ Dispatch logging: SUCCESS');

    // 3. Verify Database Log Entry
    const dbLogRes = await query('SELECT * FROM email_logs WHERE id = $1', [dispatchRes.logId]);
    assert.strictEqual(dbLogRes.rowCount, 1);
    assert.strictEqual(dbLogRes.rows[0].recipient, 'test@swaply.app');
    assert.strictEqual(dbLogRes.rows[0].email_type, 'Welcome');
    assert.strictEqual(dbLogRes.rows[0].status, 'SENT');
    console.log('✅ Database log record validated: SUCCESS');

  } catch (err) {
    console.error('❌ Email service test failed:', err.message);
    passed = false;
  } finally {
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Email Service Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');
  
  process.exit(passed ? 0 : 1);
}

runEmailServiceTest();
