import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import crypto from 'crypto';
import pool, { query } from './db.js';
import callRoutes from './routes/callRoutes.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const PORT = 5999;
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runTests() {
  console.log('Starting Swaply Production TURN Server Infrastructure Tests...\n');

  // Setup environment variables for test
  process.env.TURN_SECRET = 'swaply_turn_secret_key_98765';
  process.env.TURN_URL = 'turn:turn.swaply.org:3478,turns:turn.swaply.org:5349';

  // 1. Setup ephemeral test server
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/calls', callRoutes);

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral TURN test server listening on port ${PORT}`);

  let passed = true;
  const username = 'turnuser';
  let token = null;

  try {
    // 2. Setup mock user
    await query("DELETE FROM users WHERE username = $1", [username]);
    const res = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [`sec_${randomUUID()}`, 'TURN User', username, 'turnuser@example.com', 'pass123']
    );
    const userId = res.rows[0].id;
    token = jwt.sign({ id: userId, username }, JWT_ACCESS_SECRET);

    // 3. Test Case 1: Fetch dynamic TURN configurations
    console.log('\n--- Test Case 1: Fetch Dynamic Time-limited TURN Config ---');
    const response = await fetch(`http://localhost:${PORT}/api/calls/ice-servers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 200) {
      const data = await response.json();
      if (data.success && Array.isArray(data.iceServers)) {
        console.log(`✅ ICE: Returned ${data.iceServers.length} ICE server blocks`);
        
        // Find TURN server block
        const turnBlock = data.iceServers.find(s => Array.isArray(s.urls) && s.urls.includes('turn:turn.swaply.org:3478'));
        if (turnBlock) {
          console.log('✅ ICE: Found TURN server configurations block');
          
          // Verify URL array length
          if (turnBlock.urls.length === 2 && turnBlock.urls.includes('turns:turn.swaply.org:5349')) {
            console.log('✅ ICE: Verified TURN and TURNS (TCP/TLS) server URLs mapped');
          } else {
            console.error('❌ ICE: URLs array mismatch:', turnBlock.urls);
            passed = false;
          }

          // Verify time-limited username structure (expiryTime:username)
          const usernameParts = turnBlock.username.split(':');
          if (usernameParts.length === 2 && usernameParts[1] === username) {
            const expiry = parseInt(usernameParts[0], 10);
            const now = Math.floor(Date.now() / 1000);
            const diff = expiry - now;
            
            if (diff > 3500 && diff <= 3600) {
              console.log(`✅ ICE: Dynamic username expires in ~60 mins (Time remaining: ${diff}s)`);
            } else {
              console.error('❌ ICE: Expiration window windowMs mismatch:', diff);
              passed = false;
            }

            // Verify HMAC-SHA1 signature correctness
            const hmac = crypto.createHmac('sha1', process.env.TURN_SECRET);
            hmac.update(turnBlock.username);
            const expectedCredential = hmac.digest('base64');

            if (turnBlock.credential === expectedCredential) {
              console.log('✅ ICE: Cryptographic HMAC-SHA1 signature verified successfully');
            } else {
              console.error(`❌ ICE: Credential signature mismatch. Expected: ${expectedCredential}, Got: ${turnBlock.credential}`);
              passed = false;
            }

          } else {
            console.error('❌ ICE: Invalid time-limited username format:', turnBlock.username);
            passed = false;
          }

        } else {
          console.error('❌ ICE: TURN server block missing in output:', data.iceServers);
          passed = false;
        }
      } else {
        console.error('❌ ICE: Invalid response payload:', data);
        passed = false;
      }
    } else {
      console.error('❌ ICE: HTTP status is', response.status);
      passed = false;
    }

    // Clear db records
    await query("DELETE FROM users WHERE username = $1", [username]);

  } catch (err) {
    console.error('❌ TURN tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral TURN test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);

    // Cleanup env overrides
    delete process.env.TURN_SECRET;
    delete process.env.TURN_URL;

    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
