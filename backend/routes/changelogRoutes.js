import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/changelog
 * Retrieve published changelog & release entries
 */
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM changelog_entries ORDER BY published_at DESC LIMIT 50');

    // Default release notes if none published yet
    let entries = result.rows;
    if (entries.length === 0) {
      entries = [
        {
          id: 1,
          version: 'v2.5.0',
          title: 'SwaplyOne Enterprise Production Release',
          category: 'FEATURE',
          content: 'Full rollout of Phase 12 Enterprise Suite featuring real-time system monitoring, 24 HTML email templates, automated waitlist batch allocation, session management, call diagnostics, and advanced security center.',
          published_at: new Date().toISOString()
        },
        {
          id: 2,
          version: 'v2.4.0',
          title: 'Smart Beta Waitlist & Neo-Brutalist Paper Design System',
          category: 'FEATURE',
          content: 'Added automated waitlist slot management with 72-hour invitation expiration reallocation and official Swaply paper sticker branding.',
          published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }

    res.json({
      success: true,
      entries
    });
  } catch (err) {
    console.error('Error fetching changelog:', err);
    res.status(500).json({ error: 'Failed to fetch changelog' });
  }
});

/**
 * POST /api/admin/changelog
 * Publish new changelog entry (Admin)
 */
router.post('/admin', authenticateToken, requireAdmin, async (req, res) => {
  const { version, title, category, content } = req.body;

  if (!version || !title || !content) {
    return res.status(400).json({ error: 'Version, title, and content are required' });
  }

  try {
    const result = await query(
      `INSERT INTO changelog_entries (version, title, category, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [version, title, category || 'FEATURE', content]
    );

    res.json({
      success: true,
      message: 'Changelog entry published successfully',
      entry: result.rows[0]
    });
  } catch (err) {
    console.error('Error publishing changelog entry:', err);
    res.status(500).json({ error: 'Failed to publish changelog entry' });
  }
});

export default router;
