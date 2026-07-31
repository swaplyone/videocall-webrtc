import assert from 'assert';
import { 
  calculateQualityLevel, 
  parseIceCandidateType, 
  getBandwidthConstraints 
} from '../frontend/src/utils/webrtcHelpers.js';

async function runTests() {
  console.log('Starting Swaply Codebase Refactoring Unit Tests...\n');
  let passed = true;

  try {
    // 1. Assert calculateQualityLevel
    console.log('--- Test Case 1: calculateQualityLevel Scopes ---');
    
    // Critical Cases
    assert.strictEqual(calculateQualityLevel(16, 0, 0), 'Critical');
    assert.strictEqual(calculateQualityLevel(0, 401, 0), 'Critical');
    assert.strictEqual(calculateQualityLevel(0, 0, 101), 'Critical');

    // Poor Cases
    assert.strictEqual(calculateQualityLevel(9, 0, 0), 'Poor');
    assert.strictEqual(calculateQualityLevel(0, 251, 0), 'Poor');
    assert.strictEqual(calculateQualityLevel(0, 0, 51), 'Poor');

    // Fair Cases
    assert.strictEqual(calculateQualityLevel(4, 0, 0), 'Fair');
    assert.strictEqual(calculateQualityLevel(0, 151, 0), 'Fair');
    assert.strictEqual(calculateQualityLevel(0, 0, 31), 'Fair');

    // Good Cases
    assert.strictEqual(calculateQualityLevel(1.5, 0, 0), 'Good');
    assert.strictEqual(calculateQualityLevel(0, 81, 0), 'Good');
    assert.strictEqual(calculateQualityLevel(0, 0, 16), 'Good');

    // Excellent Case
    assert.strictEqual(calculateQualityLevel(0.5, 50, 10), 'Excellent');
    console.log('✅ calculateQualityLevel assertions passed');

    // 2. Assert parseIceCandidateType
    console.log('\n--- Test Case 2: parseIceCandidateType Scopes ---');
    assert.strictEqual(parseIceCandidateType('candidate:842163098 1 udp 16777215 192.168.1.100 56832 typ host generation 0'), 'host');
    assert.strictEqual(parseIceCandidateType('candidate:12984572 1 udp 16860159 8.8.8.8 54321 typ srflx raddr 192.168.1.100 rport 56832'), 'srflx');
    assert.strictEqual(parseIceCandidateType('candidate:33918291 1 udp 4162384 34.250.12.5 3478 typ relay raddr 8.8.8.8 rport 54321'), 'relay');
    assert.strictEqual(parseIceCandidateType('candidate:invalid string format'), 'unknown');
    assert.strictEqual(parseIceCandidateType(''), 'unknown');
    console.log('✅ parseIceCandidateType assertions passed');

    // 3. Assert getBandwidthConstraints
    console.log('\n--- Test Case 3: getBandwidthConstraints Scopes ---');
    const low = getBandwidthConstraints('Low');
    assert.strictEqual(low.maxBitrate, 100000);
    assert.strictEqual(low.scaleResolutionDownBy, 4.0);

    const med = getBandwidthConstraints('Fair');
    assert.strictEqual(med.maxBitrate, 500000);
    assert.strictEqual(med.scaleResolutionDownBy, 2.0);

    const high = getBandwidthConstraints('Excellent');
    assert.strictEqual(high.maxBitrate, 1500000);
    assert.strictEqual(high.scaleResolutionDownBy, 1.0);
    console.log('✅ getBandwidthConstraints assertions passed');

  } catch (err) {
    console.error('❌ Exception during refactoring unit tests:', err);
    passed = false;
  }

  console.log('\n==================================================');
  console.log(`Refactoring Unit Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
