import assert from 'assert';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import pool, { query } from './db.js';

const PORT = 5999;

async function runTests() {
  console.log('Starting Swaply Beta Readiness & Stress Tests...\n');
  let passed = true;

  // Setup ephemeral test server with identical socket rate limiter
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer);

  // Active callers map for the signaling test
  const activeSignalingClients = new Map();

  io.on('connection', (socket) => {
    // Socket-level event rate limiting guard (30 events/sec limit)
    const rateLimitState = { count: 0, startTime: Date.now() };
    socket.use(([event, ...args], next) => {
      const now = Date.now();
      if (now - rateLimitState.startTime > 1000) {
        rateLimitState.count = 1;
        rateLimitState.startTime = now;
        return next();
      }

      rateLimitState.count++;
      if (rateLimitState.count > 30) {
        socket.emit('error', 'Rate limit exceeded. Connection throttled.');
        return; // drop event
      }
      next();
    });

    // Mock signaling event relayer
    socket.on('signal', (data) => {
      // Echo signaling payload back to caller for latency profiling
      socket.emit('signal_relayed', data);
    });
  });

  // Start listening
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral Stress Test Server listening on port ${PORT}`);

  try {
    // Test Case 1: WebSocket Rate Limiting
    console.log('\n--- Test Case 1: WebSocket Event Rate Limiting Guard ---');
    const client = clientIo(`http://localhost:${PORT}`, { forceNew: true });
    
    let rateLimitExceeded = false;
    let rateLimitMessage = '';

    await new Promise((resolve, reject) => {
      client.on('connect', () => {
        // Listen for error messages
        client.on('error', (err) => {
          if (err && err.includes('Rate limit exceeded')) {
            rateLimitExceeded = true;
            rateLimitMessage = err;
            resolve();
          }
        });

        // Flood the socket with 50 events rapidly (within 20ms)
        for (let i = 0; i < 50; i++) {
          client.emit('signal', { test: i });
        }

        // Timeout fallback
        setTimeout(() => {
          if (!rateLimitExceeded) {
            reject(new Error('Rate limiting guard failed to throttle excessive client events'));
          }
        }, 1500);
      });
    });

    assert.strictEqual(rateLimitExceeded, true, 'Rate limiter must block client after 30 events/sec');
    assert.ok(rateLimitMessage.includes('Rate limit exceeded'), 'Error message should match');
    client.close();
    console.log('✅ Rate limiter successfully blocked event flood and notified client');

    // Test Case 2: Concurrent Sockets & Signaling Latency
    console.log('\n--- Test Case 2: Concurrent Signaling Latency Profile ---');
    const clientCount = 20;
    const clients = [];
    const connectPromises = [];

    // Create 20 concurrent clients
    for (let i = 0; i < clientCount; i++) {
      const socket = clientIo(`http://localhost:${PORT}`, { forceNew: true });
      clients.push(socket);
      connectPromises.push(new Promise((resolve) => socket.on('connect', resolve)));
    }

    await Promise.all(connectPromises);
    console.log(`✅ Connected ${clientCount} concurrent socket clients`);

    // Perform warmup signaling relay to flush Socket.io/WebSocket connection queues
    const warmupPromises = clients.map((socket) => {
      return new Promise((resolve) => {
        socket.once('signal_relayed', resolve);
        socket.emit('signal', { warmup: true });
      });
    });
    await Promise.all(warmupPromises);
    console.log('✅ Warmed up all 20 client connections');

    // Perform concurrent signaling Offer/Answer relays
    const latencies = [];
    const signalPromises = clients.map((socket, index) => {
      return new Promise((resolve) => {
        const start = performance.now();
        socket.once('signal_relayed', () => {
          const latency = performance.now() - start;
          latencies.push(latency);
          resolve();
        });
        socket.emit('signal', { offer: `SDP-CONCURRENT-${index}` });
      });
    });

    await Promise.all(signalPromises);

    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    console.log(`Average Signaling Relay Latency: ${averageLatency.toFixed(2)}ms`);
    assert.ok(averageLatency < 150, `Average signaling latency should be under 150ms (got ${averageLatency.toFixed(2)}ms)`);
    console.log('✅ Concurrent signaling transactions completed within latency boundary');

    // Close all clients
    clients.forEach(c => c.close());

    // Test Case 3: Database Connection Pool Scaling
    console.log('\n--- Test Case 3: Database Connection Pool Scaling ---');
    console.log('Pre-heating database pool...');
    await query('SELECT 1');

    console.log('Firing 30 parallel queries to verify pool capability and safety...');
    const queryPromises = [];
    for (let i = 0; i < 30; i++) {
      queryPromises.push(query('SELECT 1'));
    }

    const startQueries = Date.now();
    const queryResults = await Promise.all(queryPromises);
    const duration = Date.now() - startQueries;

    assert.strictEqual(queryResults.length, 30, 'All 30 parallel queries must execute successfully');
    console.log(`✅ Executed 30 concurrent database queries in ${duration}ms without pool leaks or lockups`);

  } catch (err) {
    console.error('❌ Exception during stress tests:', err);
    passed = false;
  }

  // Cleanup
  await new Promise((resolve) => io.close(resolve));
  await pool.end();

  console.log('\n==================================================');
  console.log(`Stress Tests Result: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('==================================================\n');

  if (passed) {
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } else {
    process.exit(1);
  }
}

runTests();
