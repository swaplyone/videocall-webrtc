import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Phase 14 Suite: Accessibility Compliance...');

async function runTest() {
  try {
    const contextPath = path.resolve(process.cwd(), 'frontend/src/context/AccessibilityContext.jsx');
    assert(fs.existsSync(contextPath), 'AccessibilityContext file exists');

    const content = fs.readFileSync(contextPath, 'utf-8');
    assert(content.includes('aria-live'), 'ARIA live region support missing');
    assert(content.includes('highContrast'), 'High contrast state missing');

    console.log('✅ Phase 14 Accessibility tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Accessibility test FAILED:', err);
    process.exit(1);
  }
}

runTest();
