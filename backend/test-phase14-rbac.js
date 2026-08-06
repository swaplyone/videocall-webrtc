import assert from 'assert';
import { seedRolesAndPermissions } from './middleware/rbacMiddleware.js';
import { query } from './db.js';

console.log('🧪 Starting Phase 14 Suite: Admin Roles & Permissions (RBAC)...');

async function runTest() {
  try {
    // 1. Seed roles & permissions
    await seedRolesAndPermissions();

    // 2. Query roles
    const rolesRes = await query('SELECT * FROM roles');
    assert(rolesRes.rows.length >= 8, 'Should have at least 8 default roles');

    // 3. Query permissions
    const permsRes = await query('SELECT * FROM permissions');
    assert(permsRes.rows.length > 0, 'Permissions table empty');

    // 4. Verify Super Admin has permissions
    const saRole = rolesRes.rows.find(r => r.name === 'Super Admin');
    assert(saRole !== undefined, 'Super Admin role missing');

    const saPerms = await query('SELECT * FROM role_permissions WHERE role_id = $1', [saRole.id]);
    assert(saPerms.rows.length > 0, 'Super Admin should have assigned permissions');

    console.log('✅ Phase 14 Admin Roles & Permissions (RBAC) tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 RBAC test FAILED:', err);
    process.exit(1);
  }
}

runTest();
