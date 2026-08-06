import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Phase 14 Suite: Beta Command Center...');

async function runTest() {
  try {
    const pagePath = path.resolve(process.cwd(), 'frontend/src/pages/BetaCommandCenter.jsx');
    assert(fs.existsSync(pagePath), 'BetaCommandCenter.jsx missing');

    const content = fs.readFileSync(pagePath, 'utf-8');
    assert(content.includes('command_center_telemetry'), 'Telemetry socket event listener missing');
    assert(content.includes('Platform Health'), 'Platform Health widget missing');
    assert(content.includes('Active Calls'), 'Active Calls widget missing');

    console.log('✅ Phase 14 Beta Command Center tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Beta Command Center test FAILED:', err);
    process.exit(1);
  }
}

runTest();
