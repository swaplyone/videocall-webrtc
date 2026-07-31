import express from 'express';
import http from 'http';
import pool, { query } from './db.js';
import { securityHeaders } from './middleware/securityMiddleware.js';
import { createRateLimiter } from './middleware/rateLimitMiddleware.js';

const PORT = 5999;

async function runTests() {
  console.log('Starting Swaply Security Hardening & Rate Limiting Tests...\n');

  // 1. Setup ephemeral test server with custom tight limits for testing
  const app = express();
  app.use(securityHeaders);
  app.use(express.json({ limit: '100' })); // Strict 100 bytes limit for test!

  // Apply rate limiter: Max 3 requests in 10s
  const testLimiter = createRateLimiter({
    windowMs: 10 * 1000,
    max: 3,
    message: 'Rate limit breached'
  });

  app.get('/test-route', testLimiter, (req, res) => {
    res.json({ success: true });
  });

  app.get('/security-headers', (req, res) => {
    res.json({ success: true });
  });

  app.post('/test-payload', (req, res) => {
    res.json({ success: true });
  });

  // Express error handler for payload limits
  app.use((err, req, res, next) => {
    if (err.status === 413) {
      res.status(413).json({ error: 'Payload too large' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  });

  const httpServer = http.createServer(app);
  await new Promise((resolve) => httpServer.listen(PORT, resolve));
  console.log(`📡 Ephemeral security test server listening on port ${PORT}`);

  let passed = true;

  try {
    const baseUrl = `http://localhost:${PORT}`;

    // --- Test Case 1: Security Headers Verification ---
    console.log('\n--- Test Case 1: Security Headers Verification ---');
    const resHeaders = await fetch(`${baseUrl}/security-headers`);
    
    const xContentType = resHeaders.headers.get('x-content-type-options');
    const xFrame = resHeaders.headers.get('x-frame-options');
    const xXss = resHeaders.headers.get('x-xss-protection');
    const csp = resHeaders.headers.get('content-security-policy');
    const refPolicy = resHeaders.headers.get('referrer-policy');

    if (xContentType === 'nosniff') {
      console.log('✅ MIME Sniffing: X-Content-Type-Options is nosniff');
    } else {
      console.error('❌ MIME Sniffing: Incorrect X-Content-Type-Options:', xContentType);
      passed = false;
    }

    if (xFrame === 'DENY') {
      console.log('✅ Clickjacking: X-Frame-Options is DENY');
    } else {
      console.error('❌ Clickjacking: Incorrect X-Frame-Options:', xFrame);
      passed = false;
    }

    if (xXss === '1; mode=block') {
      console.log('✅ XSS Protection: X-XSS-Protection is 1; mode=block');
    } else {
      console.error('❌ XSS Protection: Incorrect X-XSS-Protection:', xXss);
      passed = false;
    }

    if (csp && csp.includes("default-src 'self'")) {
      console.log('✅ Content Security Policy: CSP header is set');
    } else {
      console.error('❌ Content Security Policy: Missing CSP header');
      passed = false;
    }

    if (refPolicy === 'strict-origin-when-cross-origin') {
      console.log('✅ Referrer Policy: referrer-policy header is set');
    } else {
      console.error('❌ Referrer Policy: Incorrect Referrer-Policy:', refPolicy);
      passed = false;
    }

    // --- Test Case 2: Body Size Limit Protection ---
    console.log('\n--- Test Case 2: Payload Size Limit ---');
    // Generate massive payload exceeding 100 bytes limit
    const hugePayload = {
      largeString: 'A'.repeat(500)
    };

    const resPayload = await fetch(`${baseUrl}/test-payload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hugePayload)
    });

    if (resPayload.status === 413) {
      console.log('✅ Body Size Limit: Server correctly blocked massive payload with 413 Payload Too Large');
    } else {
      console.error('❌ Body Size Limit: Allowed large payload. Status:', resPayload.status);
      passed = false;
    }

    // --- Test Case 3: Rate Limiting Verification ---
    console.log('\n--- Test Case 3: Rate Limiting Threshold Verification ---');
    
    // Hit 1
    const r1 = await fetch(`${baseUrl}/test-route`);
    const limit = r1.headers.get('x-ratelimit-limit');
    const remaining = r1.headers.get('x-ratelimit-remaining');
    const reset = r1.headers.get('x-ratelimit-reset');

    if (r1.status === 200 && limit === '3' && remaining === '2' && reset) {
      console.log(`✅ Rate limit check 1: Success (Remaining: ${remaining})`);
    } else {
      console.error('❌ Rate limit check 1 failed. Status:', r1.status, 'Limit:', limit, 'Remaining:', remaining);
      passed = false;
    }

    // Hit 2
    const r2 = await fetch(`${baseUrl}/test-route`);
    if (r2.status === 200 && r2.headers.get('x-ratelimit-remaining') === '1') {
      console.log('✅ Rate limit check 2: Success (Remaining: 1)');
    } else {
      console.error('❌ Rate limit check 2 failed. Remaining:', r2.headers.get('x-ratelimit-remaining'));
      passed = false;
    }

    // Hit 3
    const r3 = await fetch(`${baseUrl}/test-route`);
    if (r3.status === 200 && r3.headers.get('x-ratelimit-remaining') === '0') {
      console.log('✅ Rate limit check 3: Success (Remaining: 0)');
    } else {
      console.error('❌ Rate limit check 3 failed. Remaining:', r3.headers.get('x-ratelimit-remaining'));
      passed = false;
    }

    // Hit 4 (Breach)
    const r4 = await fetch(`${baseUrl}/test-route`);
    if (r4.status === 429) {
      const body = await r4.json();
      if (body.error === 'Rate limit breached') {
        console.log('✅ Rate limit check 4: Correctly blocked request (HTTP 429 Too Many Requests)');
      } else {
        console.error('❌ Rate limit check 4 failed. Body:', body);
        passed = false;
      }
    } else {
      console.error('❌ Rate limit check 4 failed. Status:', r4.status);
      passed = false;
    }

  } catch (err) {
    console.error('❌ Security tests encountered error:', err);
    passed = false;
  } finally {
    // Shutdown server and database pool
    await new Promise((resolve) => httpServer.close(resolve));
    console.log('\n📡 Ephemeral security test server closed.');
    await pool.end();
    console.log('Database pool closed.');
    console.log(`\nTest Result: ${passed ? 'PASSED' : 'FAILED'}`);
    setTimeout(() => {
      process.exit(passed ? 0 : 1);
    }, 200);
  }
}

runTests();
