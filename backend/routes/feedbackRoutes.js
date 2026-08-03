import express from 'express';
import { query } from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/feedback
 * Submit bug report, feature request, general feedback, or call feedback
 */
router.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { type, rating, description, logPayload } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: 'Feedback type and description are required' });
  }

  try {
    const result = await query(
      `INSERT INTO feedback_reports (user_id, type, rating, description, log_payload)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, rating || null, description, JSON.stringify(logPayload || {})]
    );

    res.json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      feedback: result.rows[0]
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/admin/feedback
 * List feedback submissions (Admin)
 */
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT fr.*, u.username, u.email, u.beta_id
      FROM feedback_reports fr
      LEFT JOIN users u ON fr.user_id = u.id
      ORDER BY fr.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      reports: result.rows
    });
  } catch (err) {
    console.error('Error fetching admin feedback:', err);
    res.status(500).json({ error: 'Failed to fetch feedback submissions' });
  }
});

export default router;
