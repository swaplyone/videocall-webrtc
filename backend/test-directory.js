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
  console.log('Starting Swaply User Directory Integration Tests...\n');

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/users', userRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral directory test server listening on port ${PORT}`);

  let passed = true;
  let testUserTokens = {};
  let userIds = {};

  try {
    // 2. Clear stale test users and skills
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", ['diruser1', 'diruser2', 'diruser3']);

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
      { name: 'User One', username: 'diruser1', email: 'dir1@example.com' },
      { name: 'User Two', username: 'diruser2', email: 'dir2@example.com' },
      { name: 'User Three', username: 'diruser3', email: 'dir3@example.com' }
    ];

    for (const u of mockUsers) {
      const insRes = await query(
        `INSERT INTO users (security_id, name, username, email, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [`sec_${randomUUID()}`, u.name, u.username, u.email, 'hashedpass123']
      );
      userIds[u.username] = insRes.rows[0].id;
      
      // Sign token
      testUserTokens[u.username] = jwt.sign(
        { id: insRes.rows[0].id, username: u.username },
        JWT_ACCESS_SECRET
      );
    }

    // 5. Map Skills (TEACH/LEARN)
    // diruser1: TEACH Python, LEARN UI/UX
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['diruser1'], pythonId, uiuxId]
    );

    // diruser2: TEACH UI/UX, LEARN Python
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['diruser2'], uiuxId, pythonId]
    );

    // diruser3: TEACH Spanish, LEARN Guitar
    await query(
      `INSERT INTO user_skills (user_id, skill_id, skill_type) VALUES 
       ($1, $2, 'TEACH'), ($1, $3, 'LEARN')`,
      [userIds['diruser3'], spanishId, guitarId]
    );

    const baseUrl = `http://localhost:${PORT}/api/users/directory`;

    // 6. Test Case 1: Fetch Full Directory (as diruser1)
    console.log('\n--- Test Case 1: Fetch Full Directory (Excludes Self) ---');
    const res1 = await fetch(baseUrl, {
      headers: { 'Authorization': `Bearer ${testUserTokens['diruser1']}` }
    });

    if (res1.status === 200) {
      const data = await res1.json();
      const usernames = data.users.map(u => u.username);
      if (usernames.includes('diruser2') && usernames.includes('diruser3') && !usernames.includes('diruser1')) {
        console.log('✅ Success: Returned other nodes and correctly excluded self');
        // Assert nested skills structure
        const user2 = data.users.find(u => u.username === 'diruser2');
        if (user2 && Array.isArray(user2.skills) && user2.skills.length === 2) {
          console.log('✅ Success: Nested skills array populated correctly');
        } else {
          console.error('❌ Error: Nested skills array missing or incorrect size');
          passed = false;
        }
      } else {
        console.error('❌ Error: Directory returned incorrect user set:', usernames);
        passed = false;
      }
    } else {
      console.error('❌ Error: Fetch failed with status', res1.status);
      passed = false;
    }

    // 7. Test Case 2: Search for "Python"
    console.log('\n--- Test Case 2: Search for "Python" ---');
    const res2 = await fetch(`${baseUrl}?search=Python`, {
      headers: { 'Authorization': `Bearer ${testUserTokens['diruser1']}` }
    });

    if (res2.status === 200) {
      const data = await res2.json();
      const usernames = data.users.map(u => u.username);
      if (usernames.includes('diruser2') && !usernames.includes('diruser3')) {
        console.log('✅ Success: Correctly filtered user profile by matching skill "Python"');
      } else {
        console.error('❌ Error: Incorrect match listings for Python search:', usernames);
        passed = false;
      }
    } else {
      console.error('❌ Error: Fetch failed with status', res2.status);
      passed = false;
    }

    // 8. Test Case 3: Filter by Category "Design"
    console.log('\n--- Test Case 3: Filter by Category "Design" ---');
    const res3 = await fetch(`${baseUrl}?category=Design`, {
      headers: { 'Authorization': `Bearer ${testUserTokens['diruser1']}` }
    });

    if (res3.status === 200) {
      const data = await res3.json();
      const usernames = data.users.map(u => u.username);
      if (usernames.includes('diruser2') && !usernames.includes('diruser3')) {
        console.log('✅ Success: Filtered by category "Design"');
      } else {
        console.error('❌ Error: Category filter returned incorrect users:', usernames);
        passed = false;
      }
    } else {
      console.error('❌ Error: Fetch failed with status', res3.status);
      passed = false;
    }

    // 9. Test Case 4: Search "Spanish" + skillType "TEACH"
    console.log('\n--- Test Case 4: Search "Spanish" + skillType "TEACH" ---');
    const res4 = await fetch(`${baseUrl}?search=Spanish&skillType=TEACH`, {
      headers: { 'Authorization': `Bearer ${testUserTokens['diruser1']}` }
    });

    if (res4.status === 200) {
      const data = await res4.json();
      const usernames = data.users.map(u => u.username);
      if (usernames.includes('diruser3') && !usernames.includes('diruser2')) {
        console.log('✅ Success: Correctly matched TEACH Spanish user');
      } else {
        console.error('❌ Error: Incorrect search and skillType match:', usernames);
        passed = false;
      }
    } else {
      console.error('❌ Error: Fetch failed with status', res4.status);
      passed = false;
    }

    // 10. Clean up DB records
    await query("DELETE FROM users WHERE username IN ($1, $2, $3)", ['diruser1', 'diruser2', 'diruser3']);

  } catch (err) {
    console.error('❌ Directory integration tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral directory test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
