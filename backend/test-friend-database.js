import assert from 'assert';
import pool, { query } from './db.js';

async function runDatabaseTests() {
  console.log('Starting Swaply Friend Request Database Integration Tests...\n');
  let passed = true;

  const userA = `db_user_a_${Date.now()}`;
  const userB = `db_user_b_${Date.now()}`;
  let idA, idB;

  try {
    // 1. Setup mock users
    await query('DELETE FROM users WHERE username IN ($1, $2)', [userA, userB]);
    const resA = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_db_a_${Date.now()}`, 'User A', userA, `${userA}@swaply.test`, 'pass', `qr_${userA}`, `qr_tok_${userA}`]
    );
    idA = resA.rows[0].id;

    const resB = await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id, qr_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [`sec_db_b_${Date.now()}`, 'User B', userB, `${userB}@swaply.test`, 'pass', `qr_${userB}`, `qr_tok_${userB}`]
    );
    idB = resB.rows[0].id;

    console.log(`Created mock users: A(ID: ${idA}), B(ID: ${idB})`);

    // Cleanup previous records
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);

    // --- Check 1: Prevent self-request ---
    console.log('\n--- Check 1: Prevent Self-Friend Request constraint ---');
    try {
      await query(
        `INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'PENDING')`,
        [idA, idA]
      );
      console.error('❌ Check 1 Failed: Self friend request was allowed!');
      passed = false;
    } catch (err) {
      console.log('✅ Check 1 Passed: Successfully blocked self request (Error:', err.message, ')');
    }

    // --- Check 2: Prevent duplicate pending requests ---
    console.log('\n--- Check 2: Prevent Duplicate Pending Requests constraint ---');
    // First request
    await query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'PENDING')`,
      [idA, idB]
    );
    
    // Duplicate request
    try {
      await query(
        `INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'PENDING')`,
        [idA, idB]
      );
      console.error('❌ Check 2 Failed: Duplicate pending request was allowed!');
      passed = false;
    } catch (err) {
      console.log('✅ Check 2 Passed: Successfully blocked duplicate pending request (Error:', err.message, ')');
    }

    // --- Check 3: Prevent duplicate friendships ---
    console.log('\n--- Check 3: Prevent Duplicate Friendships constraint ---');
    // First friendship
    await query(
      `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)`,
      [idA, idB]
    );

    // Duplicate friendship (opposite direction)
    try {
      await query(
        `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)`,
        [idB, idA]
      );
      console.error('❌ Check 3 Failed: Duplicate friendship was allowed!');
      passed = false;
    } catch (err) {
      console.log('✅ Check 3 Passed: Successfully blocked duplicate friendship (Error:', err.message, ')');
    }

    // --- Check 4: Prevent self-friendship ---
    console.log('\n--- Check 4: Prevent Self-Friendship constraint ---');
    try {
      await query(
        `INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2)`,
        [idA, idA]
      );
      console.error('❌ Check 4 Failed: Self-friendship was allowed!');
      passed = false;
    } catch (err) {
      console.log('✅ Check 4 Passed: Successfully blocked self-friendship (Error:', err.message, ')');
    }

    // Cleanup mock users & relations
    await query('DELETE FROM friendships WHERE user_id IN ($1, $2) OR friend_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM friend_requests WHERE sender_id IN ($1, $2) OR receiver_id IN ($1, $2)', [idA, idB]);
    await query('DELETE FROM users WHERE id IN ($1, $2)', [idA, idB]);

  } catch (err) {
    console.error('❌ Database tests encountered error:', err);
    passed = false;
  } finally {
    await pool.end();
    console.log('\nDatabase connection closed.');
    console.log(`\nFriend Database Test Result: ${passed ? 'PASSED' : 'FAILED'}`);
    process.exit(passed ? 0 : 1);
  }
}

runDatabaseTests();
