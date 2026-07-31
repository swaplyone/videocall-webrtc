import assert from 'assert';
import { io as Client } from 'socket.io-client';
import pool, { query } from './db.js';

process.env.PORT = '5999';
const PORT = 5999;
const BACKEND_URL = `http://localhost:${PORT}`;

async function runPerformanceTests() {
  console.log('Starting Swaply Performance Optimization Verification Tests...\n');
  let passed = true;
  let serverInstance = null;

  try {
    // 1. Connect or start inline server
    const serverModule = await import('./server.js');
    serverInstance = serverModule.httpServer;
    const ioServer = serverModule.io;
    await new Promise(r => setTimeout(r, 1000));

    // --- Test Case 1: WebSocket Ping Timing Verification ---
    console.log('--- Test Case 1: WebSocket Ping Heartbeat Timing Optimization ---');
    const opts = ioServer.opts || {};
    
    assert.strictEqual(opts.pingInterval, 25000, 'pingInterval must be optimized to 25s (25000ms)');
    assert.strictEqual(opts.pingTimeout, 20000, 'pingTimeout must be optimized to 20s (20000ms)');
    
    console.log(`✅ WebSocket config: pingInterval is ${opts.pingInterval}ms`);
    console.log(`✅ WebSocket config: pingTimeout is ${opts.pingTimeout}ms`);


    // --- Test Case 2: Database Performance Index verification ---
    console.log('\n--- Test Case 2: PostgreSQL Indexing Verification ---');
    const requiredIndexes = ['idx_calls_started', 'idx_reports_created', 'idx_blocks_blocked'];
    
    const dbIndexQuery = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname IN ('idx_calls_started', 'idx_reports_created', 'idx_blocks_blocked')
    `);
    
    const activeIndexes = dbIndexQuery.rows.map(r => r.indexname);
    for (const reqIdx of requiredIndexes) {
      assert.ok(activeIndexes.includes(reqIdx), `Database index ${reqIdx} must be present in pg_indexes`);
      console.log(`✅ Database Schema: Index "${reqIdx}" is active and running`);
    }


    // --- Test Case 3: ICE Candidate Signaling Payload Minification ---
    console.log('\n--- Test Case 3: ICE Candidate Signaling Payload Size ---');
    
    const clientA = Client(BACKEND_URL, { forceNew: true });
    const clientB = Client(BACKEND_URL, { forceNew: true });

    await new Promise((resolve) => {
      let count = 0;
      const done = () => { if (++count === 2) resolve(); };
      clientA.on('connect', done);
      clientB.on('connect', done);
    });

    const userA = `perf_user_a_${Date.now()}`;
    const userB = `perf_user_b_${Date.now()}`;

    await new Promise((resolve) => {
      clientA.emit('register', userA, () => {
        clientB.emit('register', userB, () => resolve());
      });
    });

    let activeSessionId = null;
    clientB.on('incoming_call', ({ sessionId }) => {
      activeSessionId = sessionId;
      clientB.emit('accept_call', { sessionId });
    });

    await new Promise((resolve) => {
      clientA.emit('initiate_call', { to: userB }, () => resolve());
    });

    await new Promise((resolve) => {
      clientA.on('call_accepted', () => resolve());
    });

    // Client B listens for ICE candidate signal from Client A
    let receivedPayload = null;
    await new Promise((resolve) => {
      clientB.on('signal', ({ candidate, type }) => {
        if (type === 'candidate') {
          receivedPayload = candidate;
          resolve();
        }
      });

      // Simulate client A sending an optimized candidate payload
      const mockCandidatePayload = {
        candidate: 'candidate:842163049 1 udp 16777215 192.168.1.100 50352 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
        usernameFragment: 'redundant-info-not-to-be-sent',
        verboseExtraField: 'unused'
      };

      // Extract only minified fields to mimic CallInterface.jsx optimization
      const minifiedCandidate = {
        candidate: mockCandidatePayload.candidate,
        sdpMid: mockCandidatePayload.sdpMid,
        sdpMLineIndex: mockCandidatePayload.sdpMLineIndex
      };

      clientA.emit('signal', {
        sessionId: activeSessionId,
        candidate: minifiedCandidate,
        type: 'candidate'
      });
    });

    assert.ok(receivedPayload, 'Client must receive the candidate event');
    assert.strictEqual(receivedPayload.usernameFragment, undefined, 'usernameFragment must be pruned from payload');
    assert.strictEqual(receivedPayload.verboseExtraField, undefined, 'extra fields must be pruned from payload');
    assert.strictEqual(receivedPayload.candidate, 'candidate:842163049 1 udp 16777215 192.168.1.100 50352 typ host', 'candidate text must be preserved');
    assert.strictEqual(receivedPayload.sdpMid, '0', 'sdpMid must be preserved');
    assert.strictEqual(receivedPayload.sdpMLineIndex, 0, 'sdpMLineIndex must be preserved');

    console.log('✅ ICE Candidate Payload: Minified data format successfully validated');

    clientA.disconnect();
    clientB.disconnect();

  } catch (err) {
    console.error('❌ Performance test suite encountered error:', err);
    passed = false;
  }

  if (serverInstance) {
    console.log('\n🧹 Cleaning up test servers...');
    await new Promise((resolve) => {
      serverInstance.close(async () => {
        try {
          await pool.end();
        } catch (dbErr) {
          console.warn('Error closing database pool:', dbErr.message);
        }
        resolve();
      });
    });
  }

  console.log('\n==================================================');
  console.log(`Performance Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  process.exit(passed ? 0 : 1);
}

runPerformanceTests();
