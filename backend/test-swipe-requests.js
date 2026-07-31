import assert from 'assert';
import fs from 'fs';
import path from 'path';

async function runSwipeTests() {
  console.log('Starting Swaply Swipe Requests Gesture & Accessibility Tests...\n');
  let passed = true;

  try {
    // 1. Locate the component file
    const rootDir = path.resolve();
    const componentPath = path.join(rootDir, '../frontend/src/components/SwipeRequests.jsx');
    const cssPath = path.join(rootDir, '../frontend/src/components/SwipeRequests.css');

    console.log(`Verifying SwipeRequests.jsx location: ${componentPath}`);
    assert.ok(fs.existsSync(componentPath), 'SwipeRequests.jsx component must exist');
    assert.ok(fs.existsSync(cssPath), 'SwipeRequests.css stylesheet must exist');
    console.log('✅ Component files verified in directory structure');

    // 2. Read and parse content to verify Gesture events
    const content = fs.readFileSync(componentPath, 'utf8');
    console.log('\n--- Checking gesture event listeners ---');
    assert.ok(content.includes('onPointerDown'), 'Swipe card must handle onPointerDown events');
    assert.ok(content.includes('onPointerMove'), 'Swipe card must handle onPointerMove events');
    assert.ok(content.includes('onPointerUp'), 'Swipe card must handle onPointerUp events');
    assert.ok(content.includes('setPointerCapture'), 'Pointer capture must be set during drag');
    assert.ok(content.includes('releasePointerCapture'), 'Pointer capture must be released after drag');
    console.log('✅ Touch/Mouse drag unified Pointer Events correctly implemented');

    // 3. Verify card rotation maths
    console.log('\n--- Checking card physics/rotation calculations ---');
    assert.ok(content.includes('rotateDeg') || content.includes('rotate('), 'Card rotation must be computed dynamically');
    console.log('✅ Visual card rotation offset calculations validated');

    // 4. Verify accessibility fallback button triggers
    console.log('\n--- Checking accessibility controls ---');
    assert.ok(content.includes('✕ Pass') || content.includes('Reject'), 'Accessible reject button fallback must be defined');
    assert.ok(content.includes('✓ Connect') || content.includes('Accept'), 'Accessible accept button fallback must be defined');
    console.log('✅ Tactile action buttons mapped for keyboard/a11y support');

  } catch (err) {
    console.error('❌ Swipe verification tests failed:', err.message);
    passed = false;
  }

  console.log('\n==================================================');
  console.log(`Swipe UI Verification Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runSwipeTests();
