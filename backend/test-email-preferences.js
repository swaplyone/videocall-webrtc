import assert from 'assert';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import pool from './db.js';

const TEST_PORT = 5003;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

async function runPreferencesTests() {
  console.log('Starting Swaply Notification Preferences Tests...');
  let passed = true;

  const { default: express } = await import('express');
  const app = express();
  app.use(express.json());
  
  const { default: authRoutes } = await import('./routes/authRoutes.js');
  app.use('/api/auth', authRoutes);

  const server = app.listen(TEST_PORT);

  try {
    await query('DELETE FROM users WHERE username = $1', ['pref_tester']);

    // Register user
    const registerRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Preference Tester',
        username: 'pref_tester',
        email: 'pref@swaply.app',
        password: 'password123'
      })
    });
    const regJson = await registerRes.json();
    assert.strictEqual(registerRes.status, 201);
    
    const userId = regJson.user.id;
    await query('UPDATE users SET email_verified = TRUE WHERE id = $1', [userId]);

    const token = jwt.sign(
      { id: userId, username: 'pref_tester', securityId: regJson.user.security_id },
      JWT_SECRET
    );

    // 1. Update Preferences (Module 14)
    const updateRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/email-preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        friendRequests: false,
        friendAccepted: true,
        betaUpdates: false,
        productAnnouncements: false
      })
    });
    const updateJson = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateJson.preferences.friendRequests, false);
    assert.strictEqual(updateJson.preferences.friendAccepted, true);
    console.log('✅ Preferences HTTP PUT update: SUCCESS');

    // 2. Query Database to verify persistence
    const dbRes = await query('SELECT email_notifications FROM users WHERE id = $1', [userId]);
    assert.strictEqual(dbRes.rowCount, 1);
    const notifications = dbRes.rows[0].email_notifications;
    assert.strictEqual(notifications.friendRequests, false);
    assert.strictEqual(notifications.friendAccepted, true);
    assert.strictEqual(notifications.betaUpdates, false);
    console.log('✅ Database preferences persistence check: SUCCESS');

  } catch (err) {
    console.error('❌ Preferences API Tests failed:', err.message);
    passed = false;
  } finally {
    server.close();
    await pool.end();
  }
}

runPreferencesTests();
