// Swaply Call Quality Scoring and Bitrate Telemetry Unit Tests

function calculateQuality(lossRate, rttMs, jitterMs) {
  if (lossRate > 15 || rttMs > 400 || jitterMs > 100) return 'Critical';
  if (lossRate > 8 || rttMs > 250 || jitterMs > 50) return 'Poor';
  if (lossRate > 3 || rttMs > 150 || jitterMs > 30) return 'Fair';
  if (lossRate > 1 || rttMs > 80 || jitterMs > 15) return 'Good';
  return 'Excellent';
}

function calculateBitrate(currentBytes, prevBytes, timeDiffSec) {
  if (timeDiffSec <= 0) return 0;
  return ((currentBytes - prevBytes) * 8) / (timeDiffSec * 1000);
}

function runTests() {
  console.log('Starting Swaply Call Quality Monitoring Telemetry Tests...\n');
  let passed = true;

  // 1. Quality scoring assertions
  const testCases = [
    { loss: 0.2, rtt: 40, jitter: 5, expected: 'Excellent' },
    { loss: 1.5, rtt: 90, jitter: 10, expected: 'Good' },
    { loss: 2.5, rtt: 70, jitter: 20, expected: 'Good' }, // jitter bound triggers Good
    { loss: 4.0, rtt: 120, jitter: 25, expected: 'Fair' },
    { loss: 9.0, rtt: 280, jitter: 45, expected: 'Poor' },
    { loss: 18.0, rtt: 100, jitter: 12, expected: 'Critical' }, // high loss triggers Critical
    { loss: 0.1, rtt: 450, jitter: 8, expected: 'Critical' },  // high RTT triggers Critical
    { loss: 0.2, rtt: 50, jitter: 110, expected: 'Critical' }  // high jitter triggers Critical
  ];

  console.log('--- Test Case 1: Connection Quality Level Scoring Matrix ---');
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const actual = calculateQuality(tc.loss, tc.rtt, tc.jitter);
    if (actual === tc.expected) {
      console.log(`✅ Assert [Loss: ${tc.loss}%, RTT: ${tc.rtt}ms, Jitter: ${tc.jitter}ms] -> Mapped correctly to ${tc.expected}`);
    } else {
      console.error(`❌ Assert FAILED [Loss: ${tc.loss}%, RTT: ${tc.rtt}ms, Jitter: ${tc.jitter}ms] -> Expected ${tc.expected}, Got: ${actual}`);
      passed = false;
    }
  }

  // 2. Bitrate calculations assertions
  console.log('\n--- Test Case 2: Bitrate Difference Computations (Kbps) ---');
  const bitrateCases = [
    { curr: 1000000, prev: 500000, time: 2, expected: 2000 },  // 500k bytes * 8 bits / 2s / 1000 = 2000 Kbps
    { curr: 250000, prev: 250000, time: 2, expected: 0 },
    { curr: 500000, prev: 0, time: 0, expected: 0 }             // division by zero check
  ];

  for (let i = 0; i < bitrateCases.length; i++) {
    const bc = bitrateCases[i];
    const actual = calculateBitrate(bc.curr, bc.prev, bc.time);
    if (actual === bc.expected) {
      console.log(`✅ Assert [Delta: ${bc.curr - bc.prev} bytes, Time: ${bc.time}s] -> Calculated: ${actual} Kbps`);
    } else {
      console.error(`❌ Assert FAILED [Delta: ${bc.curr - bc.prev} bytes, Time: ${bc.time}s] -> Expected ${bc.expected}, Got: ${actual}`);
      passed = false;
    }
  }

  console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
  process.exit(passed ? 0 : 1);
}

runTests();
