import assert from 'assert';
import { query } from './db.js';

console.log('🧪 Starting Phase 14 Suite: Production Hardening Audit...');

async function runTest() {
  try {
    // 1. Verify schema tables exist
    const tables = [
      'user_consents', 'legal_policy_versions', 'activity_logs',
      'admin_logs', 'api_logs', 'security_logs', 'feature_flags',
      'maintenance_state', 'roles', 'permissions', 'media_files'
    ];

    for (const t of tables) {
      const res = await query(`SELECT COUNT(*) FROM ${t}`);
      assert(res.rows !== undefined, `Table ${t} check failed`);
    }

    console.log('✅ Phase 14 Production Hardening Audit PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Production Hardening test FAILED:', err);
    process.exit(1);
  }
}

runTest();
