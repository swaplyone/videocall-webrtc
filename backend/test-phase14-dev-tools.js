import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Phase 14 Suite: Developer Tools...');

async function runTest() {
  try {
    const devRoutesPath = path.resolve(process.cwd(), 'backend/routes/devRoutes.js');
    assert(fs.existsSync(devRoutesPath), 'devRoutes.js missing');

    const content = fs.readFileSync(devRoutesPath, 'utf-8');
    assert(content.includes('/swagger.json'), 'OpenAPI spec endpoint missing');
    assert(content.includes('/playground'), 'API playground endpoint missing');
    assert(content.includes('/health'), 'Health telemetry endpoint missing');

    console.log('✅ Phase 14 Developer Tools tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Developer Tools test FAILED:', err);
    process.exit(1);
  }
}

runTest();
