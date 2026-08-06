import assert from 'assert';
import { getFeatureFlags, setFeatureFlag, isFeatureEnabled, initFeatureFlags } from './services/featureFlagService.js';

console.log('🧪 Starting Phase 14 Suite: Feature Flags...');

async function runTest() {
  try {
    await initFeatureFlags();

    // 1. Get all flags
    const flags = await getFeatureFlags();
    assert(typeof flags === 'object', 'Flags must be an object');
    assert(flags.video_calls !== undefined, 'video_calls flag missing');

    // 2. Set feature flag status
    await setFeatureFlag('video_calls', false);
    const enabled = await isFeatureEnabled('video_calls');
    assert(enabled === false, 'Setting feature flag failed');

    // Reset flag back to true
    await setFeatureFlag('video_calls', true);
    const resetEnabled = await isFeatureEnabled('video_calls');
    assert(resetEnabled === true, 'Resetting feature flag failed');

    console.log('✅ Phase 14 Feature Flags tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Feature Flags test FAILED:', err);
    process.exit(1);
  }
}

runTest();
