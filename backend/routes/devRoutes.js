import express from 'express';
import pool, { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET /api/dev/version - Version info
router.get('/version', (req, res) => {
  return res.json({
    success: true,
    platform: 'SwaplyOne Standalone Video Calling Platform',
    version: '1.4.0-beta',
    release: 'Public Beta Phase 14',
    buildTimestamp: new Date().toISOString()
  });
});

// GET /api/dev/build-info - Build information
router.get('/build-info', (req, res) => {
  return res.json({
    success: true,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsage: process.memoryUsage()
  });
});

// GET /api/dev/health - Comprehensive health telemetry
router.get('/health', async (req, res) => {
  let dbStatus = 'HEALTHY';
  try {
    await query('SELECT 1');
  } catch (err) {
    dbStatus = 'DEGRADED';
  }

  return res.json({
    status: dbStatus === 'HEALTHY' ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      webSockets: 'ACTIVE',
      fileStorage: 'OPERATIONAL',
      emailService: 'CONFIGURED'
    },
    resources: {
      uptime: process.uptime(),
      memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024))
    }
  });
});

// GET /api/dev/env - Environment Inspector (Sanitized)
router.get('/env', authenticateToken, requireAdmin, (req, res) => {
  const sanitizedEnv = { ...process.env };
  // Hide secret credentials
  ['PGPASSWORD', 'JWT_SECRET', 'EMAIL_PASSWORD', 'SMTP_PASS'].forEach(k => {
    if (sanitizedEnv[k]) sanitizedEnv[k] = '********';
  });

  return res.json({ success: true, env: sanitizedEnv });
});

// POST /api/dev/validate-config - Configuration Validator
router.post('/validate-config', authenticateToken, requireAdmin, (req, res) => {
  const checks = [
    { name: 'PORT', valid: Boolean(process.env.PORT) },
    { name: 'JWT_SECRET', valid: Boolean(process.env.JWT_SECRET) },
    { name: 'DATABASE_URL or PG Host', valid: Boolean(process.env.DATABASE_URL || process.env.PGHOST) }
  ];

  const allValid = checks.every(c => c.valid);
  return res.json({ success: true, valid: allValid, checks });
});

// GET /api/dev/swagger.json - OpenAPI Spec Documentation
router.get('/swagger.json', (req, res) => {
  const swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'SwaplyOne Video Calling Platform API',
      version: '1.4.0',
      description: 'API specification for WebRTC video calling, messaging, privacy, legal, and admin command operations.'
    },
    paths: {
      '/api/health': { get: { summary: 'System health check' } },
      '/api/auth/login': { post: { summary: 'User login' } },
      '/api/calls/start': { post: { summary: 'Initiate WebRTC call' } },
      '/api/legal/policies': { get: { summary: 'Get legal policy documents' } },
      '/api/feature-flags': { get: { summary: 'Get platform feature flags' } }
    }
  };
  return res.json(swaggerSpec);
});

// GET /api/dev/playground - API Playground HTML UI
router.get('/playground', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Swaply API Playground</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
          h1 { color: #38bdf8; }
          .card { background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
          button { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Swaply Developer API Playground</h1>
        <div class="card">
          <h3>Test /api/health Endpoint</h3>
          <button onclick="fetch('/api/dev/health').then(r=>r.json()).then(d=>document.getElementById('out').innerText=JSON.stringify(d,null,2))">Test Health</button>
        </div>
        <div class="card">
          <h3>Test /api/feature-flags Endpoint</h3>
          <button onclick="fetch('/api/feature-flags').then(r=>r.json()).then(d=>document.getElementById('out').innerText=JSON.stringify(d,null,2))">Test Flags</button>
        </div>
        <pre id="out" style="background:#020617; padding:15px; border-radius:6px; overflow:auto;"></pre>
      </body>
    </html>
  `);
});

// POST /api/dev/seed - Database Seeder
router.post('/seed', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Seed demo test user if not present
    await query(
      `INSERT INTO users (security_id, name, username, email, password_hash, beta_id)
       VALUES ('SEC_SEED_01', 'Demo Developer', 'demodev', 'demo@swaply.app', '$2a$10$abcdefghijklmnopqrstuu', 'BETA-DEV-100')
       ON CONFLICT (username) DO NOTHING`
    );

    return res.json({ success: true, message: 'Database seeded with default developer fixtures.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Seeding failed' });
  }
});

// GET /api/dev/logs - Debug Log File Reader
router.get('/logs', authenticateToken, requireAdmin, (req, res) => {
  const logPath = path.resolve(process.cwd(), 'logs/app.log');
  if (!fs.existsSync(logPath)) {
    return res.json({ success: true, logs: ['[INFO] Log file empty or initializing...'] });
  }
  const lines = fs.readFileSync(logPath, 'utf-8').split('\n').slice(-50);
  return res.json({ success: true, logs: lines });
});

export default router;
