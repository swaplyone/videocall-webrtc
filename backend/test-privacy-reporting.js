import pg from 'pg';
import jwt from 'jsonwebtoken';
import express from 'express';
import { randomUUID } from 'crypto';
import pool, { query } from './db.js';
import userRoutes from './routes/userRoutes.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';
const TEST_PORT = 5999;

async function runReportingTest() {
  console.log('Starting Swaply Privacy Reporting Tests...');
  let serverInstance = null;
  let passed = true;

  try {
    const app = express();
    app.use(express.json());
    app.use('/api/users', userRoutes);

    serverInstance = app.listen(TEST_PORT);

    // Seed mock data
    await query('DELETE FROM privacy_events');
    await query('DELETE FROM friendships');
    await query('DELETE FROM calls');
    await query('DELETE FROM reports');
    await query('DELETE FROM users WHERE username IN ($1, $2)', ['alice', 'bob']);

    const userARes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Alice', 'alice', 'alice@swaply.com', 'password123', 'SWP-ALICE', true]
    );
    const userAId = userARes.rows[0].id;

    const userBRes = await query(
      "INSERT INTO users (security_id, name, username, email, password_hash, beta_id, searchable, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id",
      [`sec_${randomUUID()}`, 'Bob', 'bob', 'bob@swaply.com', 'password123', 'SWP-BOB', true]
    );
    const userBId = userBRes.rows[0].id;

    const callSessionId = 'session_reporting_test';
    const callRes = await query(
      "INSERT INTO calls (caller_id, receiver_id, session_id, status) VALUES ($1, $2, $3, 'ACTIVE') RETURNING id",
      [userAId, userBId, callSessionId]
    );
    const dbCallId = callRes.rows[0].id;

    const token = jwt.sign({ id: userAId, username: 'alice' }, JWT_SECRET);

    // File standard report referencing Call ID (Module 11)
    const reportRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/users/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        username: 'bob',
        reason: 'Harassment',
        description: 'Repeatedly switching window tabs during our call',
        callSessionId,
        privacyEventId: 101
      })
    });

    const body = await reportRes.json();
    if (reportRes.status !== 200 || !body.success) {
      throw new Error(`Failed to submit report: ${JSON.stringify(body)}`);
    }

    console.log('✅ Report filed successfully against Bob.');

    // Verify report fields inside DB (Module 11 details validation)
    const dbCheck = await query('SELECT * FROM reports WHERE reporter_id = $1', [userAId]);
    if (dbCheck.rowCount !== 1) {
      throw new Error('Report row count mismatch in database');
    }
    const reportRow = dbCheck.rows[0];
    if (reportRow.call_id !== dbCallId || reportRow.privacy_event_id !== 101) {
      throw new Error(`DB fields mismatch: got call_id=${reportRow.call_id}, privacy_event_id=${reportRow.privacy_event_id}`);
    }
    console.log('✅ Verified report contains reporter, reported, call ID, privacy event ID snapshot.');

  } catch (err) {
    console.error('❌ Reporting test failed:', err.message);
    passed = false;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await pool.end();
  }

  console.log('\n==================================================');
  console.log(`Privacy Reporting Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  setTimeout(() => {
    process.exit(passed ? 0 : 1);
  }, 100);
}

runReportingTest();
