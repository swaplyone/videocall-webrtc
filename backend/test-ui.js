import fs from 'fs';
import path from 'path';
import assert from 'assert';

const cssPath = path.resolve('../frontend/src/index.css');

function runUITests() {
  console.log('Starting Swaply UI & UX Styling Verification Tests...\n');
  let passed = true;

  try {
    // Test Case 1: Stylesheet Existence
    console.log('--- Test Case 1: index.css Existence ---');
    assert.ok(fs.existsSync(cssPath), 'index.css stylesheet must exist in frontend assets');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    console.log('✅ index.css exists and is readable');

    // Test Case 2: Animation Keyframes Presence
    console.log('\n--- Test Case 2: Keyframe Animations Presence ---');
    assert.ok(cssContent.includes('modalSlideIn'), 'modalSlideIn keyframe animation must be defined');
    assert.ok(cssContent.includes('pulseGlow'), 'pulseGlow keyframe animation must be defined');
    console.log('✅ Premium micro-animation keyframes are defined');

    // Test Case 3: Bento Grid & Retro Elements
    console.log('\n--- Test Case 3: Layout & Glassmorphic Accents Verification ---');
    assert.ok(cssContent.includes('table-retro'), 'table-retro styles must exist for directory logs');
    assert.ok(cssContent.includes('glass-panel'), 'glass-panel rules must exist for modals');
    assert.ok(cssContent.includes('pulse-glow'), 'pulse-glow class must exist for notifications');
    assert.ok(cssContent.includes('select-retro-dark'), 'select-retro-dark rules must exist for device selection menus');
    assert.ok(cssContent.includes('status-ringing'), 'status-ringing rules must exist for call status state indicators');
    assert.ok(cssContent.includes('status-call-rejected'), 'status-call-rejected rules must exist for rejected call state indicators');
    console.log('✅ UI layout elements, dark dropdowns, and neobrutalist status tokens are present');

  } catch (err) {
    console.error('❌ Exception during UI tests:', err);
    passed = false;
  }

  console.log('\n==================================================');
  console.log(`UI Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runUITests();
