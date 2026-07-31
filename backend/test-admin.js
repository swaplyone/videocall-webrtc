import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import adminRoutes from './routes/adminRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Admin Moderation Dashboard Tests...\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/admin', adminRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral Admin test server listening on port ${PORT}`);

  let passed = true;
  const adminName = 'adminuser';
  const targetName = 'abusiveuser';
  let token = null;
  let adminId = null;
  let targetId = null;
  let callId = null;
  let messageId = null;
  let reportId = null;

  try {
    // 2. Setup mock fixtures
    await query("DELETE FROM reports WHERE reason = 'TestAbuse'");
    await query("DELETE FROM messages WHERE message = 'TestFlaggedMessageText'");
    await query("DELETE FROM users WHERE username IN ($1, $2)", [adminName, targetName]);

    const resAdmin = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Admin User', adminName, 'admin@example.com', 'pass123']
    );
    adminId = resAdmin.rows[0].id;
    token = jwt.sign({ id: adminId, username: adminName }, JWT_ACCESS_SECRET);

    const resTarget = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'Abusive User', targetName, 'abuse@example.com', 'pass123']
    );
    targetId = resTarget.rows[0].id;

    // Seed call
    const resCall = await query(
      `INSERT INTO calls (caller_id, receiver_id, status)
       VALUES ($1, $2, 'active') RETURNING id`,
      [adminId, targetId]
    );
    callId = resCall.rows[0].id;

    // Seed conversations & flagged message
    const resConv = await query('INSERT INTO conversations DEFAULT VALUES RETURNING id');
    const convId = resConv.rows[0].id;
    await query('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)', [convId, adminId, targetId]);
    
    const resMsg = await query(
      `INSERT INTO messages (conversation_id, sender_id, message, moderation_status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [convId, targetId, 'TestFlaggedMessageText', 'FLAGGED']
    );
    messageId = resMsg.rows[0].id;

    // Seed safety report
    const resRep = await query(
      `INSERT INTO reports (reporter_id, reported_user_id, reason, description, status)
       VALUES ($1, $2, 'TestAbuse', 'Harassment', 'PENDING') RETURNING id`,
      [adminId, targetId]
    );
    reportId = resRep.rows[0].id;

    // 3. Test Case 1: Fetch system stats
    console.log('\n--- Test Case 1: Fetch System Stats ---');
    const statsRes = await fetch(`http://localhost:${PORT}/api/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (statsRes.status === 200) {
      const data = await statsRes.json();
      if (data.success && data.stats) {
        console.log('✅ Stats: Received aggregate metrics payload:', data.stats);
        if (data.stats.totalUsers >= 2 && data.stats.totalCalls >= 1 && data.stats.flaggedMessages >= 1) {
          console.log('✅ Stats: Metrics logic counting checks passed');
        } else {
          console.error('❌ Stats: Counts are incorrect:', data.stats);
          passed = false;
        }
      } else {
        console.error('❌ Stats: Payload invalid:', data);
        passed = false;
      }
    } else {
      console.error('❌ Stats: HTTP status is', statsRes.status);
      passed = false;
    }

    // 4. Test Case 2: Fetch abuse reports
    console.log('\n--- Test Case 2: Fetch Abuse Reports ---');
    const reportsRes = await fetch(`http://localhost:${PORT}/api/admin/reports`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (reportsRes.status === 200) {
      const data = await reportsRes.json();
      if (data.success && Array.isArray(data.reports)) {
        console.log(`✅ Reports: Returned ${data.reports.length} report listings`);
        const testReport = data.reports.find(r => r.id === reportId);
        if (testReport && testReport.reporter_username === adminName && testReport.reported_username === targetName) {
          console.log('✅ Reports: Verified sender/target username joins succeed');
        } else {
          console.error('❌ Reports: Usernames join mapping failed for target test report:', testReport);
          passed = false;
        }
      } else {
        console.error('❌ Reports: Payload invalid:', data);
        passed = false;
      }
    } else {
      console.error('❌ Reports: HTTP status is', reportsRes.status);
      passed = false;
    }

    // 5. Test Case 3: Update report status
    console.log('\n--- Test Case 3: Update Report Status ---');
    const updateRes = await fetch(`http://localhost:${PORT}/api/admin/reports/${reportId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'REVIEWED' })
    });

    if (updateRes.status === 200) {
      const data = await updateRes.json();
      if (data.success && data.report.status === 'REVIEWED') {
        console.log('✅ Update Report: Endpoint successfully returned status as REVIEWED');
        
        // Assert in DB
        const dbRes = await query('SELECT status FROM reports WHERE id = $1', [reportId]);
        if (dbRes.rows[0].status === 'REVIEWED') {
          console.log('✅ Update Report: Committed status update in PostgreSQL');
        } else {
          console.error('❌ Update Report: Status in DB is', dbRes.rows[0].status);
          passed = false;
        }
      } else {
        console.error('❌ Update Report: Payload invalid:', data);
        passed = false;
      }
    } else {
      console.error('❌ Update Report: HTTP status is', updateRes.status);
      passed = false;
    }

    // 6. Cleanup test records
    await query("DELETE FROM reports WHERE reason = 'TestAbuse'");
    await query("DELETE FROM messages WHERE message = 'TestFlaggedMessageText'");
    await query("DELETE FROM conversation_members WHERE conversation_id = $1", [convId]);
    await query("DELETE FROM conversations WHERE id = $1", [convId]);
    await query("DELETE FROM calls WHERE id = $1", [callId]);
    await query("DELETE FROM users WHERE username IN ($1, $2)", [adminName, targetName]);

  } catch (err) {
    console.error('❌ Admin tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral Admin test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
