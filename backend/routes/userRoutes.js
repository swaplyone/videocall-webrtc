import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/users/directory
 * 
 * Retrieves user profiles along with their associated skills.
 * Supports query parameters:
 *  - search (filters by name, username, bio, or skill name)
 *  - category (filters by skill category e.g. Technology, Design)
 *  - skillType (filters by us.skill_type: 'TEACH' or 'LEARN')
 */
router.get('/directory', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { search, category, skillType } = req.query;

  try {
    // 1. Fetch current user's skills to compute match score
    const userSkills = await query(
      'SELECT skill_id, skill_type FROM user_skills WHERE user_id = $1',
      [userId]
    );
    const teachIds = userSkills.rows.filter(r => r.skill_type === 'TEACH').map(r => r.skill_id);
    const learnIds = userSkills.rows.filter(r => r.skill_type === 'LEARN').map(r => r.skill_id);

    // 2. Base query: Aggregate user profile, nested skills, and matching score percentage
    let queryText = `
      SELECT u.id, u.name, u.username, u.online_status, u.bio, u.profile_image,
             COALESCE(
               json_agg(
                 json_build_object(
                   'skill_id', s.id,
                   'skill_name', s.name,
                   'category', s.category,
                   'skill_type', us.skill_type
                 )
               ) FILTER (WHERE s.id IS NOT NULL),
               '[]'::json
             ) AS skills,
             (
               COALESCE(MAX(CASE WHEN us.skill_type = 'LEARN' AND us.skill_id = ANY($2::integer[]) THEN 50 ELSE 0 END), 0) +
               COALESCE(MAX(CASE WHEN us.skill_type = 'TEACH' AND us.skill_id = ANY($3::integer[]) THEN 50 ELSE 0 END), 0)
             )::integer AS match_score
      FROM users u
      LEFT JOIN user_skills us ON u.id = us.user_id
      LEFT JOIN skills s ON us.skill_id = s.id
      WHERE u.id != $1
        AND u.id NOT IN (SELECT blocked_user_id FROM blocks WHERE blocker_id = $1)
        AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_user_id = $1)
      GROUP BY u.id
    `;

    const queryParams = [userId, teachIds, learnIds];
    const havingConditions = [];

    // 3. Filter by Search Query
    if (search && search.trim().length > 0) {
      queryParams.push(`%${search.trim()}%`);
      const paramIndex = queryParams.length;
      havingConditions.push(`(
        u.name ILIKE $${paramIndex} OR 
        u.username ILIKE $${paramIndex} OR 
        COALESCE(u.bio, '') ILIKE $${paramIndex} OR
        bool_or(s.name ILIKE $${paramIndex})
      )`);
    }

    // 4. Filter by Category
    if (category && category.trim().length > 0) {
      queryParams.push(category.trim());
      const paramIndex = queryParams.length;
      havingConditions.push(`bool_or(s.category = $${paramIndex})`);
    }

    // 5. Filter by Skill Type (TEACH / LEARN)
    if (skillType && (skillType.toUpperCase() === 'TEACH' || skillType.toUpperCase() === 'LEARN')) {
      queryParams.push(skillType.trim().toUpperCase());
      const paramIndex = queryParams.length;
      havingConditions.push(`bool_or(us.skill_type = $${paramIndex})`);
    }

    // Inject HAVING conditions if filters are set
    if (havingConditions.length > 0) {
      queryText += ` HAVING ` + havingConditions.join(' AND ');
    }

    // Sort by match_score DESC, online status, then alphabetically by username
    queryText += ` ORDER BY match_score DESC, CASE WHEN u.online_status = 'online' THEN 1 WHEN u.online_status = 'away' THEN 2 ELSE 3 END, u.username ASC`;

    const result = await query(queryText, queryParams);
    res.json({
      success: true,
      users: result.rows
    });
  } catch (err) {
    console.error('Error fetching user directory:', err);
    res.status(500).json({ error: 'Server error fetching directory' });
  }
});

/**
 * POST /api/users/block
 * 
 * Blocks another user by username.
 */
router.post('/block', authenticateToken, async (req, res) => {
  const blockerId = req.user.id;
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    // Resolve user ID
    const targetRes = await query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const blockedId = targetRes.rows[0].id;

    if (blockerId === blockedId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    // Insert block entry
    await query(
      `INSERT INTO blocks (blocker_id, blocked_user_id) 
       VALUES ($1, $2) 
       ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING`,
      [blockerId, blockedId]
    );

    res.json({ success: true, message: `Successfully blocked ${username}` });
  } catch (err) {
    console.error('Error blocking user:', err);
    res.status(500).json({ error: 'Server error blocking user' });
  }
});

/**
 * POST /api/users/unblock
 * 
 * Unblocks another user by username.
 */
router.post('/unblock', authenticateToken, async (req, res) => {
  const blockerId = req.user.id;
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  try {
    // Resolve user ID
    const targetRes = await query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const blockedId = targetRes.rows[0].id;

    // Delete block entry
    await query(
      'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [blockerId, blockedId]
    );

    res.json({ success: true, message: `Successfully unblocked ${username}` });
  } catch (err) {
    console.error('Error unblocking user:', err);
    res.status(500).json({ error: 'Server error unblocking user' });
  }
});

/**
 * POST /api/users/report
 * 
 * Submits an abuse report against another user.
 */
router.post('/report', authenticateToken, async (req, res) => {
  const reporterId = req.user.id;
  const { username, reason, description } = req.body;

  if (!username || !reason) {
    return res.status(400).json({ error: 'Username and reason are required' });
  }

  try {
    // Resolve user ID
    const targetRes = await query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const reportedId = targetRes.rows[0].id;

    if (reporterId === reportedId) {
      return res.status(400).json({ error: 'You cannot report yourself' });
    }

    // Insert report entry
    await query(
      `INSERT INTO reports (reporter_id, reported_user_id, reason, description, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`,
      [reporterId, reportedId, reason.trim(), description ? description.trim() : null]
    );

    res.json({ success: true, message: `Report successfully filed against ${username}` });
  } catch (err) {
    console.error('Error reporting user:', err);
    res.status(500).json({ error: 'Server error reporting user' });
  }
});

export default router;
