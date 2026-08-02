import { execSync } from 'child_process';

const testSuites = [
  'test-screenshot-detection.js',
  'test-privacy-events.js',
  'test-privacy-rate-limit.js',
  'test-privacy-warning.js',
  'test-privacy-notification.js',
  'test-privacy-escalation.js',
  'test-privacy-reporting.js',
  'test-privacy-blocking.js',
  'test-privacy-dashboard.js',
  'test-privacy-security.js',
  // Phase 8 Test Suites
  'test-email-service.js',
  'test-otp.js',
  'test-otp-security.js',
  'test-email-verification.js',
  'test-password-reset.js',
  'test-email-preferences.js',
  'test-email-logs.js',
  'test-admin-email.js',
  'test-admin-users.js',
  'test-pip-events.js',
  'test-qr-validation.js',
  // Phase 10 Test Suites
  'test-account-deletion-db.js',
  'test-account-deletion-api.js',
  'test-account-deletion-scheduler.js',
  'test-account-recovery.js',
  'test-account-cleanup.js'
];

console.log('==================================================');
console.log('SWAPLY PRIVACY & SAFETY MASTER TEST RUNNER');
console.log('==================================================\n');

let passedCount = 0;
let failedCount = 0;

for (const suite of testSuites) {
  console.log(`Running suite: ${suite}...`);
  try {
    execSync(`node backend/${suite}`, { stdio: 'inherit' });
    passedCount++;
  } catch (err) {
    console.error(`❌ Suite ${suite} FAILED`);
    failedCount++;
  }
}

console.log('\n==================================================');
console.log('MASTER TEST SUITE SUMMARY');
console.log('==================================================');
console.log(`TOTAL SUITES: ${testSuites.length}`);
console.log(`PASSED:       ${passedCount}`);
console.log(`FAILED:       ${failedCount}`);
console.log('==================================================');

process.exit(failedCount > 0 ? 1 : 0);
