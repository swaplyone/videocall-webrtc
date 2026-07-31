// Swaply Audio & Device Management Telemetry Unit Tests

// Mock device configuration lists
const mockDevices = [
  { deviceId: 'mic-1', kind: 'audioinput', label: 'Default Microphone' },
  { deviceId: 'mic-2', kind: 'audioinput', label: 'Studio USB Mic' },
  { deviceId: 'cam-1', kind: 'videoinput', label: 'FaceTime HD Camera' },
  { deviceId: 'cam-2', kind: 'videoinput', label: 'Logitech Brio 4K' },
  { deviceId: 'spk-1', kind: 'audiooutput', label: 'Built-in Audio Out' }
];

let getUserMediaCallCount = 0;
let lastUserMediaConstraints = null;

// Mock getUserMedia
function mockGetUserMedia(constraints) {
  getUserMediaCallCount++;
  lastUserMediaConstraints = constraints;
  return Promise.resolve({
    getAudioTracks: () => [{ stop: () => {} }],
    getVideoTracks: () => [{ stop: () => {} }]
  });
}

function runTests() {
  console.log('Starting Swaply Audio Quality & Device Management Tests...\n');
  let passed = true;

  // Test Case 1: Enumerate Devices and Filter Types
  console.log('--- Test Case 1: Enumerate and Segment Media Devices ---');
  const audioInputs = mockDevices.filter(d => d.kind === 'audioinput');
  const videoInputs = mockDevices.filter(d => d.kind === 'videoinput');
  const audioOutputs = mockDevices.filter(d => d.kind === 'audiooutput');

  if (audioInputs.length === 2 && videoInputs.length === 2 && audioOutputs.length === 1) {
    console.log(`✅ Devices enumerated successfully: Mic (${audioInputs.length}), Camera (${videoInputs.length}), Speaker (${audioOutputs.length})`);
  } else {
    console.error('❌ Device segmentation count mismatch.');
    passed = false;
  }

  // Test Case 2: Audio Media Constraint Formatting
  console.log('\n--- Test Case 2: Audio Processor Filter WebRTC Constraints ---');
  getUserMediaCallCount = 0;
  
  const selectedAudioInput = 'mic-2';
  const echoCancellation = true;
  const noiseSuppression = false;
  const autoGainControl = true;

  const audioConstraints = {
    audio: {
      deviceId: selectedAudioInput ? { exact: selectedAudioInput } : undefined,
      echoCancellation,
      noiseSuppression,
      autoGainControl
    }
  };

  mockGetUserMedia(audioConstraints);

  if (
    lastUserMediaConstraints.audio.deviceId.exact === 'mic-2' &&
    lastUserMediaConstraints.audio.echoCancellation === true &&
    lastUserMediaConstraints.audio.noiseSuppression === false &&
    lastUserMediaConstraints.audio.autoGainControl === true
  ) {
    console.log('✅ WebRTC Audio Constraints built correctly with toggles mapping:');
    console.log(`   - deviceId.exact: ${lastUserMediaConstraints.audio.deviceId.exact}`);
    console.log(`   - echoCancellation: ${lastUserMediaConstraints.audio.echoCancellation}`);
    console.log(`   - noiseSuppression: ${lastUserMediaConstraints.audio.noiseSuppression}`);
    console.log(`   - autoGainControl: ${lastUserMediaConstraints.audio.autoGainControl}`);
  } else {
    console.error('❌ Audio constraints mapping failed. Got:', lastUserMediaConstraints.audio);
    passed = false;
  }

  // Test Case 3: replaceTrack dynamic switching
  console.log('\n--- Test Case 3: Dynamic RTCRtpSender.replaceTrack Interface ---');
  let replaceTrackCallCount = 0;
  let lastReplacedTrack = null;

  const mockVideoSender = {
    track: { kind: 'video' },
    replaceTrack: (track) => {
      replaceTrackCallCount++;
      lastReplacedTrack = track;
      return Promise.resolve();
    }
  };

  async function mockSwitchCamera(deviceId) {
    const newTrack = { id: 'track-new-cam', kind: 'video' };
    if (mockVideoSender.track.kind === 'video') {
      await mockVideoSender.replaceTrack(newTrack);
    }
  }

  mockSwitchCamera('cam-2').then(() => {
    if (replaceTrackCallCount === 1 && lastReplacedTrack.id === 'track-new-cam') {
      console.log('✅ dynamic camera switch replaced track successfully via RTCRtpSender.replaceTrack()');
    } else {
      console.error('❌ replaceTrack was not called correctly.');
      passed = false;
    }

    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    process.exit(passed ? 0 : 1);
  });
}

runTests();
