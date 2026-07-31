import { exec } from 'child_process';
import path from 'path';

const testSuites = [
  'test-turn.js',
  'test-call-state-machine.js',
  'test-call-reconnection.js',
  'test-call-quality.js',
  'test-adaptive-quality.js',
  'test-audio-devices.js',
  'test-precall-lobby.js',
  'test-call-controls.js',
  'test-call-feedback.js',
  'test-db.js',
  'test-auth.js',
  'test-presence.js',
  'test-directory.js',
  'test-matching.js',
  'test-chat.js',
  'test-calls.js',
  'test-ice.js',
  'test-security.js',
  'test-blocking.js',
  'test-notices.js',
  'test-admin.js',
  'test-moderator.js',
  'test-call-history.js',
  'test-browser.js',
  'test-mobile.js',
  'test-monitoring.js',
  'test-stress.js',
  'test-refactoring.js',
  'test-documentation.js',
  'test-sdk.js',
  'test-ui.js',
  'test-recovery.js',
  'test-security-audit.js',
  'test-performance.js'
];

async function runSuite(fileName) {
  return new Promise((resolve) => {
    console.log(`\n==================================================`);
    console.log(`🏃 Running: ${fileName}`);
    console.log(`==================================================`);
    
    exec(`node ${fileName}`, (error, stdout, stderr) => {
      console.log(stdout);
      if (stderr) console.error(stderr);
      
      if (error) {
        console.log(`❌ ${fileName} FAILED (Exit Code: ${error.code})`);
        resolve({ file: fileName, success: false });
      } else {
        console.log(`✅ ${fileName} PASSED`);
        resolve({ file: fileName, success: true });
      }
    });
  });
}

async function runAll() {
  console.log('Swaply Integrated Test Suites Runner Starting...\n');
  const results = [];
  
  for (const suite of testSuites) {
    const res = await runSuite(suite);
    results.push(res);
  }
  
  console.log('\n==================================================');
  console.log('                 TEST SUMMARY REPORT              ');
  console.log('==================================================');
  let passedCount = 0;
  for (const r of results) {
    const status = r.success ? '✅ PASSED' : '❌ FAILED';
    if (r.success) passedCount++;
    console.log(`${r.file.padEnd(25)} : ${status}`);
  }
  console.log('==================================================');
  console.log(`Result: ${passedCount}/${testSuites.length} suites passed.`);
  console.log('==================================================\n');
  
  process.exit(passedCount === testSuites.length ? 0 : 1);
}

runAll();
