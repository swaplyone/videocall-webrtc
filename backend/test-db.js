import pool from './db.js';

async function test() {
  console.log('Starting Swaply Database Integration Tests...\n');
  let testUserId = null;
  let passed = true;

  try {
    // 1. Connection check
    const timeRes = await pool.query('SELECT NOW()');
    console.log('✅ Connection check: Server time is', timeRes.rows[0].now);

    // Clean up any stale test user
    await pool.query('DELETE FROM users WHERE username = $1', ['testuser']);

    // 2. Insert test user
    const insertRes = await pool.query(
      `INSERT INTO users (security_id, name, username, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      ['test-sec-id-123', 'Test User', 'testuser', 'testuser@example.com', 'dummyhash123']
    );
    testUserId = insertRes.rows[0].id;
    console.log(`✅ Insert test user: success (ID: ${testUserId})`);

    // 3. Query back test user
    const selectRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [testUserId]);
    if (selectRes.rows[0].name === 'Test User' && selectRes.rows[0].email === 'testuser@example.com') {
      console.log('✅ Select user validation: matches inserted values');
    } else {
      console.error('❌ Select user validation failed');
      passed = false;
    }

    // 4. Test unique constraint (duplicate username)
    try {
      await pool.query(
        `INSERT INTO users (security_id, name, username, email, password_hash)
         VALUES ($1, $2, $3, $4, $5)`,
        ['test-sec-id-456', 'Duplicate User', 'testuser', 'dup@example.com', 'dummyhash123']
      );
      console.error('❌ Unique constraint check failed (duplicate username was allowed)');
      passed = false;
    } catch (err) {
      console.log('✅ Unique constraint check: successfully blocked duplicate username (Error:', err.message, ')');
    }

    // 5. Clean up test user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    const verifyDel = await pool.query('SELECT count(*) FROM users WHERE id = $1', [testUserId]);
    if (parseInt(verifyDel.rows[0].count, 10) === 0) {
      console.log('✅ Delete cleanup: successfully removed test user');
    } else {
      console.error('❌ Delete cleanup: failed to remove user');
      passed = false;
    }

  } catch (err) {
    console.error('❌ Database integration tests failed:', err);
    passed = false;
  } finally {
    await pool.end();
    console.log('\nDatabase pool connection closed.');
    process.exit(passed ? 0 : 1);
  }
}

test();
