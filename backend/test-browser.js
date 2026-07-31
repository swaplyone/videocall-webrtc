import { checkBrowserCompatibility } from '../frontend/src/utils/browserSupport.js';

async function runTests() {
  console.log('Starting Swaply Browser Compatibility & Feature Detection Tests...\n');
  let passed = true;

  try {
    // Helper to simulate globals
    const createMockGlobals = ({
      webRTC = true,
      getUserMedia = true,
      enumerateDevices = true,
      pip = true,
      fullscreen = true,
      replaceTrack = true,
      setParameters = true,
      getStats = true,
      isSecureContext = true,
      protocol = 'https:',
      hostname = 'swaply.app'
    } = {}) => {
      const globals = {
        isSecureContext,
        location: { protocol, hostname },
        window: {
          RTCPeerConnection: webRTC ? function() {} : undefined,
          RTCRtpSender: replaceTrack || setParameters ? {
            prototype: {
              replaceTrack: replaceTrack ? function() {} : undefined,
              setParameters: setParameters ? function() {} : undefined
            }
          } : undefined,
          HTMLVideoElement: pip ? {
            prototype: { requestPictureInPicture: function() {} }
          } : undefined
        },
        navigator: {
          mediaDevices: getUserMedia || enumerateDevices ? {
            getUserMedia: getUserMedia ? function() {} : undefined,
            enumerateDevices: enumerateDevices ? function() {} : undefined
          } : undefined
        },
        document: {
          fullscreenEnabled: fullscreen
        }
      };

      // Add prototype method to getStats on RTCPeerConnection
      if (globals.window.RTCPeerConnection && getStats) {
        globals.window.RTCPeerConnection.prototype = {
          getStats: function() {}
        };
      }

      return globals;
    };

    // Test Case 1: Google Chrome (Modern & Secure)
    console.log('--- Test Case 1: Google Chrome (Modern & Secure) ---');
    const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const chromeGlobals = createMockGlobals();
    const chromeResult = checkBrowserCompatibility(chromeUA, chromeGlobals);

    if (chromeResult.browser.name === 'Google Chrome' && chromeResult.status === 'Excellent') {
      console.log('✅ Chrome parsed correctly with status Excellent');
    } else {
      console.error('❌ Chrome parse failure:', chromeResult);
      passed = false;
    }
    if (chromeResult.features.webRTC && chromeResult.features.getUserMedia && chromeResult.features.pictureInPicture && chromeResult.features.fullscreen) {
      console.log('✅ All core Chrome features reported active');
    } else {
      console.error('❌ Chrome features incorrect:', chromeResult.features);
      passed = false;
    }

    // Test Case 2: Microsoft Edge (Modern & Secure)
    console.log('\n--- Test Case 2: Microsoft Edge (Modern & Secure) ---');
    const edgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const edgeGlobals = createMockGlobals();
    const edgeResult = checkBrowserCompatibility(edgeUA, edgeGlobals);

    if (edgeResult.browser.name === 'Microsoft Edge' && edgeResult.status === 'Excellent') {
      console.log('✅ Edge parsed correctly with status Excellent');
    } else {
      console.error('❌ Edge parse failure:', edgeResult);
      passed = false;
    }

    // Test Case 3: Mozilla Firefox (Modern & Secure)
    console.log('\n--- Test Case 3: Mozilla Firefox (Modern & Secure) ---');
    const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0';
    const firefoxGlobals = createMockGlobals();
    const firefoxResult = checkBrowserCompatibility(firefoxUA, firefoxGlobals);

    if (firefoxResult.browser.name === 'Mozilla Firefox' && firefoxResult.status === 'Excellent') {
      console.log('✅ Firefox parsed correctly with status Excellent');
    } else {
      console.error('❌ Firefox parse failure:', firefoxResult);
      passed = false;
    }

    // Test Case 4: Apple Safari (Modern & Secure Context)
    console.log('\n--- Test Case 4: Apple Safari (Modern & Secure Context) ---');
    const safariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    const safariGlobals = createMockGlobals();
    const safariResult = checkBrowserCompatibility(safariUA, safariGlobals);

    if (safariResult.browser.name === 'Apple Safari' && safariResult.status === 'Good') {
      console.log('✅ Safari parsed correctly with status Good (noted autoplay/safari quirks)');
      if (safariResult.notes.some(n => n.includes('autoplay'))) {
        console.log('✅ Safari autoplay warning successfully included');
      } else {
        console.error('❌ Safari autoplay warning missing in notes');
        passed = false;
      }
    } else {
      console.error('❌ Safari parse failure:', safariResult);
      passed = false;
    }

    // Test Case 5: Apple Safari on Insecure HTTP Context
    console.log('\n--- Test Case 5: Apple Safari on Insecure HTTP Context ---');
    const safariInsecureGlobals = createMockGlobals({
      isSecureContext: false,
      protocol: 'http:',
      hostname: '192.168.0.4'
    });
    const safariInsecureResult = checkBrowserCompatibility(safariUA, safariInsecureGlobals);
    if (safariInsecureResult.notes.some(n => n.includes('HTTPS secure context'))) {
      console.log('✅ Safari insecure context warning successfully triggered');
    } else {
      console.error('❌ Safari insecure context check failed');
      passed = false;
    }

    // Test Case 6: Legacy/IE Browser (Unsupported Core WebRTC)
    console.log('\n--- Test Case 6: Legacy/IE Browser (Unsupported Core WebRTC) ---');
    const ieUA = 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko';
    const ieGlobals = createMockGlobals({ webRTC: false, getUserMedia: false });
    const ieResult = checkBrowserCompatibility(ieUA, ieGlobals);

    if (ieResult.status === 'Unsupported') {
      console.log('✅ Legacy browser categorized as Unsupported');
      if (ieResult.notes.some(n => n.includes('not supported'))) {
        console.log('✅ Unsupported browser notification present');
      } else {
        console.error('❌ Unsupported warning missing');
        passed = false;
      }
    } else {
      console.error('❌ Failed to mark legacy browser as Unsupported');
      passed = false;
    }

    // Test Case 7: Insecure HTTP Context Warning (General)
    console.log('\n--- Test Case 7: Insecure HTTP Context Warning (General) ---');
    const chromeInsecureGlobals = createMockGlobals({ isSecureContext: false });
    const chromeInsecureResult = checkBrowserCompatibility(chromeUA, chromeInsecureGlobals);
    if (chromeInsecureResult.status === 'Warning' && chromeInsecureResult.notes.some(n => n.includes('Insecure HTTP context'))) {
      console.log('✅ General insecure HTTP context warning active');
    } else {
      console.error('❌ General insecure context warning check failed:', chromeInsecureResult);
      passed = false;
    }

  } catch (err) {
    console.error('❌ Exception during browser compatibility tests:', err);
    passed = false;
  }

  console.log('\n==================================================');
  console.log(`Browser Compatibility Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runTests();
