import assert from 'assert';
import { getMaintenanceState, updateMaintenanceState } from './services/maintenanceService.js';

console.log('🧪 Starting Phase 14 Suite: Maintenance Mode...');

async function runTest() {
  try {
    // 1. Get initial state
    const state = await getMaintenanceState();
    assert(state !== null, 'Maintenance state returned null');

    // 2. Enable maintenance mode
    const updated = await updateMaintenanceState({
      active: true,
      mode: 'read_only',
      message: 'Maintenance test active'
    });

    assert(updated.active === true, 'Failed to activate maintenance mode');
    assert(updated.mode === 'read_only', 'Failed to set mode');

    // Reset back to inactive
    await updateMaintenanceState({
      active: false,
      mode: 'scheduled',
      message: 'System is operational.'
    });

    const resetState = await getMaintenanceState();
    assert(resetState.active === false, 'Failed to reset maintenance mode');

    console.log('✅ Phase 14 Maintenance Mode tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Maintenance Mode test FAILED:', err);
    process.exit(1);
  }
}

runTest();
