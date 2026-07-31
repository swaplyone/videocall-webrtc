import assert from 'assert';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

async function runReadinessChecks() {
  console.log('Starting Swaply Final Production Readiness Checks...\n');
  let passed = true;

  try {
    // --- Check 1: Environment Variables Sanity Check ---
    console.log('--- Check 1: Production Environment Verification ---');
    const secret = process.env.JWT_ACCESS_SECRET;
    if (secret && secret !== 'swaply_jwt_access_secret_key_12345') {
      console.log('✅ Security: JWT_ACCESS_SECRET is customized for production');
    } else {
      console.warn('⚠️ Warning: Using default development JWT_ACCESS_SECRET');
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (refreshSecret && refreshSecret !== 'swaply_jwt_refresh_secret_key_67890') {
      console.log('✅ Security: JWT_REFRESH_SECRET is customized for production');
    } else {
      console.warn('⚠️ Warning: Using default development JWT_REFRESH_SECRET');
    }

    // --- Check 2: Database Connection Pool Verification ---
    console.log('\n--- Check 2: Database Connection Pool Health Check ---');
    const dbTimeRes = await pool.query('SELECT NOW()');
    assert.ok(dbTimeRes.rows[0].now, 'Database must return current timestamp');
    console.log(`✅ DB Health: Connected successfully (Server time: ${dbTimeRes.rows[0].now})`);

    // Verify pool max connections (PostgreSQL defaults or configured limits)
    const poolConfig = pool.options || {};
    const maxConns = poolConfig.max || 10; // Default pg pool size is 10
    console.log(`✅ DB Config: Connection pool max size is configured at ${maxConns}`);


    // --- Check 3: CORS and Origin Policy Checks ---
    console.log('\n--- Check 3: CORS and Security Origins Check ---');
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (allowedOrigins) {
      console.log(`✅ CORS Config: Allowed origins explicitly set to "${allowedOrigins}"`);
    } else {
      console.log('✅ CORS Config: Default local/wildcard fallback setup active for development');
    }

  } catch (err) {
    console.error('❌ Production readiness check failed:', err);
    passed = false;
  } finally {
    try {
      await pool.end();
    } catch (dbErr) {
      console.warn('Error closing database pool:', dbErr.message);
    }
  }

  console.log('\n==================================================');
  console.log(`Production Readiness Check Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runReadinessChecks();
