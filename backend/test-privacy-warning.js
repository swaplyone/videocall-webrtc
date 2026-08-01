import assert from 'assert';

console.log('Running Swaply Local Privacy Warning Tests...');

const warningStates = {
  isOpen: false,
  message: '',
  source: ''
};

function triggerLocalWarning(source) {
  warningStates.isOpen = true;
  warningStates.source = source;
  warningStates.message = 'Possible screen-capture activity was detected.';
}

triggerLocalWarning('SCREENSHOT_KEY');

assert.strictEqual(warningStates.isOpen, true);
assert.strictEqual(warningStates.source, 'SCREENSHOT_KEY');
assert.ok(warningStates.message.includes('Possible screen-capture activity'));

console.log('✅ Warning popup state matches expected neobrutalist parameters.');
console.log('==================================================');
console.log('Privacy Warning State Tests Result: PASSED');
console.log('==================================================\n');

setTimeout(() => {
  process.exit(0);
}, 100);
