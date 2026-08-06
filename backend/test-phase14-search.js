import assert from 'assert';
import { query } from './db.js';

console.log('🧪 Starting Phase 14 Suite: Search Optimization...');

async function runTest() {
  try {
    // 1. Verify user search index execution
    const resUsers = await query(
      'SELECT id, username, beta_id FROM users WHERE LOWER(username) LIKE $1 LIMIT 5',
      ['%test%']
    );
    assert(Array.isArray(resUsers.rows), 'Indexed query for username search failed');

    // 2. Insert recent search term
    const userRes = await query('SELECT id FROM users LIMIT 1');
    const userId = userRes.rows[0]?.id || 1;

    await query('INSERT INTO recent_searches (user_id, query) VALUES ($1, $2)', [userId, 'react dev']);
    const recentRes = await query('SELECT * FROM recent_searches WHERE user_id = $1', [userId]);
    assert(recentRes.rows.length > 0, 'Recent search tracking failed');

    console.log('✅ Phase 14 Search Optimization tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Search Optimization test FAILED:', err);
    process.exit(1);
  }
}

runTest();
