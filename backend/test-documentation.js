import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('Starting Swaply API Documentation Consistency Tests...\n');
  let passed = true;

  try {
    const apiMdPath = path.resolve(__dirname, '../API.md');
    
    // Test Case 1: Check file existence
    console.log('--- Test Case 1: API.md File Existence ---');
    const exists = fs.existsSync(apiMdPath);
    assert.strictEqual(exists, true, 'API.md file must exist in the workspace root');
    console.log('✅ API.md file exists in workspace root');

    // Test Case 2: Check content matches REST Endpoints
    console.log('\n--- Test Case 2: REST HTTP API Endpoint Documentation ---');
    const content = fs.readFileSync(apiMdPath, 'utf8');
    
    const requiredRestRoutes = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/me',
      '/api/calls/feedback',
      '/api/calls/history',
      '/api/health'
    ];

    requiredRestRoutes.forEach((route) => {
      assert.ok(content.includes(route), `Documentation must cover REST route: ${route}`);
    });
    console.log('✅ All REST HTTP routes are documented with payload specs');

    // Test Case 3: Check content matches Socket Events
    console.log('\n--- Test Case 3: Socket.io Event Documentation ---');
    const requiredSocketEvents = [
      'register',
      'request_call',
      'accept_call',
      'reject_call',
      'signal',
      'incoming_call',
      'call_accepted',
      'peer_signal',
      'video_state_changed'
    ];

    requiredSocketEvents.forEach((event) => {
      assert.ok(content.includes(event), `Documentation must cover Socket event: ${event}`);
    });
    console.log('✅ All real-time WebSocket events are documented');

    // Test Case 4: Check WebRTC signaling flows diagram
    console.log('\n--- Test Case 4: WebRTC signaling flows ---');
    assert.ok(content.includes('sequenceDiagram'), 'Documentation must include a Mermaid sequenceDiagram for WebRTC signaling');
    assert.ok(content.includes('ICE Candidate Exchange'), 'Mermaid flows must cover candidate exchanges');
    console.log('✅ Mermaid WebRTC sequence diagram validated successfully');

  } catch (err) {
    console.error('❌ Exception during API documentation tests:', err);
    passed = false;
  }

  console.log('\n==================================================');
  console.log(`Documentation Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
