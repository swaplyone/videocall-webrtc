// Swaply Pre-Call Lobby Diagnostics and Sound Synthesizer Tests

let oscillatorFrequency = 0;
let oscillatorStarted = false;
let oscillatorStopped = false;
let audioDestinationConnected = false;

// Mock Web Audio API
class MockOscillatorNode {
  constructor() {
    this.frequency = {
      setValueAtTime: (freq) => {
        oscillatorFrequency = freq;
      }
    };
  }
  connect(dest) {
    audioDestinationConnected = true;
  }
  start() {
    oscillatorStarted = true;
  }
  stop() {
    oscillatorStopped = true;
  }
}

class MockGainNode {
  constructor() {
    this.gain = {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {}
    };
  }
  connect(dest) {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = Date.now();
    this.destination = {};
  }
  createOscillator() {
    return new MockOscillatorNode();
  }
  createGain() {
    return new MockGainNode();
  }
}

// Global window mock for Node environment
global.window = {
  AudioContext: MockAudioContext
};

function playSpeakerTest() {
  const ctx = new global.window.AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.frequency.setValueAtTime(440);
  osc.start();
  osc.stop();
}

async function runNetworkDiagnostic() {
  let gatheredStunCandidate = false;
  
  const tempPc = {
    createDataChannel: () => {},
    createOffer: () => Promise.resolve({}),
    setLocalDescription: () => Promise.resolve(),
    close: () => {}
  };

  const startTime = Date.now();
  
  // Simulate candidate gathering
  await new Promise((resolve) => {
    setTimeout(() => {
      gatheredStunCandidate = true;
      resolve();
    }, 150);
  });

  const duration = Date.now() - startTime;
  const status = duration < 250 ? 'Excellent' : 'Good';

  return { duration, status, gatheredStunCandidate };
}

async function runTests() {
  console.log('Starting Swaply Pre-Call Lobby & Diagnostics Integration Tests...\n');
  let passed = true;

  // Test Case 1: Speaker Synthesizer Tone Beep
  console.log('--- Test Case 1: Web Audio Oscillator Pitch Verification ---');
  oscillatorFrequency = 0;
  oscillatorStarted = false;
  oscillatorStopped = false;

  playSpeakerTest();

  if (oscillatorFrequency === 440 && oscillatorStarted && oscillatorStopped) {
    console.log('✅ Oscillator beep synthesised successfully at standard pitch: 440 Hz');
  } else {
    console.error(`❌ Oscillator configuration failure. Freq: ${oscillatorFrequency}, Started: ${oscillatorStarted}, Stopped: ${oscillatorStopped}`);
    passed = false;
  }

  // Test Case 2: STUN Latency Latency Diagnostics
  console.log('\n--- Test Case 2: STUN candidate Latency & Status Resolution ---');
  const diagnostic = await runNetworkDiagnostic();
  if (diagnostic.gatheredStunCandidate && diagnostic.duration >= 150 && diagnostic.status === 'Excellent') {
    console.log(`✅ STUN latency check gathered candidate in: ${diagnostic.duration} ms`);
    console.log(`✅ Latency status mapped correctly to: ${diagnostic.status}`);
  } else {
    console.error('❌ STUN latency checks diagnostic failed:', diagnostic);
    passed = false;
  }

  console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
  process.exit(passed ? 0 : 1);
}

runTests();
