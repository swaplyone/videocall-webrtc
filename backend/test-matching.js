import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pool, { query } from './db.js';
import userRoutes from './routes/userRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Skill Exchange Matching Tests...\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/users', userRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral matching test server listening on port ${PORT}`);

  let passed = true;
  let testUserTokens = {};
  let userIds = {};

  try {
    // 2. Clear stale test users
    const usernames = ['matchuserA', 'matchuserB', 'matchuserC', 'matchuserD', 'matchuserE'];
    await query("DELETE FROM users WHERE username = ANY($1)", [usernames]);

    // 3. Get Seeded Skill IDs
    const skillRes = await query("SELECT id, name FROM skills");
    const skillMap = {};
    skillRes.rows.forEach(row => {
      skillMap[row.name] = row.id;
    });

    const pythonId = skillMap['Python Programming'];
    const uiuxId = skillMap['UI/UX Design'];
    const spanishId = skillMap['Spanish Conversation'];
    const guitarId = skillMap['Guitar Practice'];

    if (!pythonId || !uiuxId || !spanishId || !guitarId) {
      throw new Error('Required default skills not seeded in database. Please run node db-init.js first.');
    }

    // 4. Create mock users
    const mockUsers = [
      { name: 'User A', username: 'matchuserA', email: 'm_a@example.com' },
      { name: 'User B', username: 'matchuserB', email: 'm_b@example.com' },
      { name: 'User C', username: 'matchuserC', email: 'm_c@example.com' },
      { name: 'User D', username: 'matchuserD', email: 'm_d@example.com' },
      { name: 'User E', username: 'matchuserE', email: 'm_e@example.com' }
    ];

    for (const u of mockUsers) {
      const insRes = await query(
        `INSERT INTO users (security_id, name, username, email, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [`sec_${randomUUID()}`, u.name, u.username, u.email, 'hashedpass123']
      );
      userIds[u.username] = insRes.rows[0].id;
      
      // Sign access token
      testUserTokens[u.username] = jwt.sign(
        { id: insRes.rows[0].id, username: u.username },
        JWT_ACCESS_SECRET
      );
    }

    // 5. Map Skills (TEACH/LEARN)
    // User A (Requester): TEACH Python, LEARN UI/UX
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['matchuserA'], pythonId, uiuxId]
    );

    // User B (100% Match): TEACH UI/UX, LEARN Python
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['matchuserB'], uiuxId, pythonId]
    );

    // User C (50% Match - Incoming): TEACH UI/UX, LEARN Spanish
    // (Teaches what A wants, but learns something A does not teach)
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['matchuserC'], uiuxId, spanishId]
    );

    // User D (50% Match - Outgoing): TEACH Spanish, LEARN Python
    // (Learns what A teaches, but teaches something A does not want)
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['matchuserD'], spanishId, pythonId]
    );

    // User E (0% Match): TEACH Spanish, LEARN Guitar
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['matchuserE'], spanishId, guitarId]
    );

    // 6. Request Directory from User A's Perspective
    const baseUrl = `http://localhost:${PORT}/api/users/directory`;
    const res = await fetch(baseUrl, {
      headers: { 'Authorization': `Bearer ${testUserTokens['matchuserA']}` }
    });

    if (res.status === 200) {
      const data = await res.json();
      
      const userB = data.users.find(u => u.username === 'matchuserB');
      const userC = data.users.find(u => u.username === 'matchuserC');
      const userD = data.users.find(u => u.username === 'matchuserD');
      const userE = data.users.find(u => u.username === 'matchuserE');

      console.log('Results parsed: checking match scores...');

      // Assert B = 100
      if (userB && userB.match_score === 100) {
        console.log('✅ User B (Reciprocal Partner): Match score is 100%');
      } else {
        console.error('❌ User B: Incorrect score, got:', userB ? userB.match_score : 'null');
        passed = false;
      }

      // Assert C = 50
      if (userC && userC.match_score === 50) {
        console.log('✅ User C (Incoming match only): Match score is 50%');
      } else {
        console.error('❌ User C: Incorrect score, got:', userC ? userC.match_score : 'null');
        passed = false;
      }

      // Assert D = 50
      if (userD && userD.match_score === 50) {
        console.log('✅ User D (Outgoing match only): Match score is 50%');
      } else {
        console.error('❌ User D: Incorrect score, got:', userD ? userD.match_score : 'null');
        passed = false;
      }

      // Assert E = 0
      if (userE && userE.match_score === 0) {
        console.log('✅ User E (No intersection): Match score is 0%');
      } else {
        console.error('❌ User E: Incorrect score, got:', userE ? userE.match_score : 'null');
        passed = false;
      }

      // Assert Sorting Order
      // B (100) must appear before C/D (50) which must appear before E (0)
      const listUsernames = data.users.map(u => u.username);
      const indexB = listUsernames.indexOf('matchuserB');
      const indexC = listUsernames.indexOf('matchuserC');
      const indexD = listUsernames.indexOf('matchuserD');
      const indexE = listUsernames.indexOf('matchuserE');

      if (indexB < indexC && indexB < indexD && indexC < indexE && indexD < indexE) {
        console.log('✅ Directory Sorting Order: Best match partners (100% -> 50% -> 0%) sorted to top successfully');
      } else {
        console.error('❌ Directory Sorting Order: Incorrect order in response list:', listUsernames);
        passed = false;
      }

    } else {
      console.error('❌ Error: Directory fetch failed with status', res.status);
      passed = false;
    }

    // 7. Clean up test users
    await query("DELETE FROM users WHERE username = ANY($1)", [usernames]);

  } catch (err) {
    console.error('❌ Matching tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral matching test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
