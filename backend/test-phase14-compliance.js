import assert from 'assert';
import { query } from './db.js';

console.log('🧪 Starting Phase 14 Suite: Compliance & Legal Center...');

async function runTest() {
  try {
    // 1. Verify legal policy versions query
    const resPolicies = await query('SELECT * FROM legal_policy_versions');
    assert(Array.isArray(resPolicies.rows), 'legal_policy_versions query failed');

    // 2. Insert mock consent record
    const userRes = await query('SELECT id FROM users LIMIT 1');
    const userId = userRes.rows[0]?.id || 1;

    await query(
      'INSERT INTO user_consents (user_id, policy_type, version, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, 'PRIVACY', '1.0.0', '127.0.0.1']
    );

    const consentCheck = await query('SELECT * FROM user_consents WHERE user_id = $1 AND policy_type = $2', [userId, 'PRIVACY']);
    assert(consentCheck.rows.length > 0, 'Consent tracking insertion failed');

    console.log('✅ Phase 14 Compliance & Legal Center tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Compliance test FAILED:', err);
    process.exit(1);
  }
}

runTest();
