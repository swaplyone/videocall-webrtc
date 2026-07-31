import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

/**
 * GET /api/calls/history
 * 
 * Retrieves Call History logs for the authenticated user.
 */
router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { type, quality } = req.query;

  try {
    let sql = `
      SELECT c.id, c.status, c.started_at, c.ended_at, c.duration,
             u1.username AS caller_username, u1.name AS caller_name,
             u2.username AS receiver_username, u2.name AS receiver_name,
             f.rating AS feedback_rating, f.issues AS feedback_issues
      FROM calls c
      JOIN users u1 ON c.caller_id = u1.id
      JOIN users u2 ON c.receiver_id = u2.id
      LEFT JOIN call_feedback f ON c.id = f.call_id AND f.user_id = $1
      WHERE (c.caller_id = $1 OR c.receiver_id = $1)
    `;
    const params = [userId];

    if (type) {
      const typeLower = type.toLowerCase();
      if (typeLower === 'incoming') {
        sql += ' AND c.receiver_id = $1';
      } else if (typeLower === 'outgoing') {
        sql += ' AND c.caller_id = $1';
      } else if (typeLower === 'missed') {
        sql += " AND c.status = 'missed'";
      } else if (typeLower === 'rejected') {
        sql += " AND c.status = 'rejected'";
      }
    }

    if (quality) {
      const qualityMap = {
        excellent: 5,
        good: 4,
        fair: 3,
        poor: 2,
        critical: 1
      };
      const val = qualityMap[quality.toLowerCase()];
      if (val !== undefined) {
        sql += ` AND f.rating = $${params.length + 1}`;
        params.push(val);
      }
    }

    sql += ' ORDER BY c.started_at DESC';

    const result = await query(sql, params);

    // Format logs for client friendly display
    const formattedCalls = result.rows.map(row => {
      const isCaller = row.caller_username === req.user.username;
      const partnerName = isCaller ? row.receiver_name : row.caller_name;
      const partnerUsername = isCaller ? row.receiver_username : row.caller_username;
      
      // Calculate display duration (e.g. "2 minutes", "45 seconds")
      let durationStr = '0s';
      if (row.duration) {
        if (row.duration < 60) {
          durationStr = `${row.duration} seconds`;
        } else {
          const mins = Math.floor(row.duration / 60);
          const secs = row.duration % 60;
          durationStr = secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
        }
      }

      // Map feedback rating to a connection quality level tag
      let qualityTag = 'Unrated';
      if (row.feedback_rating) {
        const tags = {
          5: 'Excellent',
          4: 'Good',
          3: 'Fair',
          2: 'Poor',
          1: 'Critical'
        };
        qualityTag = tags[row.feedback_rating] || 'Unrated';
      }

      return {
        id: row.id,
        partner_name: partnerName,
        partner_username: partnerUsername,
        is_caller: isCaller,
        status: row.status,
        started_at: row.started_at,
        duration: durationStr,
        raw_duration: row.duration,
        quality_tag: qualityTag,
        feedback_rating: row.feedback_rating,
        feedback_issues: row.feedback_issues
      };
    });

    res.json({
      success: true,
      calls: formattedCalls
    });

  } catch (err) {
    console.error('Error fetching call history:', err);
    res.status(500).json({ error: 'Server error fetching call history' });
  }
});

/**
 * GET /api/calls/ice-servers
 * 
 * Retrieves dynamic ICE (STUN/TURN) configurations for WebRTC peer connections.
 * Employs a secure token validation fallback.
 */
router.get('/ice-servers', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  const publicIceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ];

  if (!token) {
    return res.json({
      success: true,
      iceServers: publicIceServers
    });
  }

  jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.json({
        success: true,
        iceServers: publicIceServers
      });
    }

    const iceServers = [...publicIceServers];
    if (process.env.TURN_SECRET) {
      const expiryTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour validity
      const username = `${expiryTime}:${decoded.username || 'user'}`;
      const hmac = crypto.createHmac('sha1', process.env.TURN_SECRET);
      hmac.update(username);
      const credential = hmac.digest('base64');
      const turnUrlRaw = process.env.TURN_URL || 'turn:localhost:3478';
      const turnUrls = turnUrlRaw.includes(',') ? turnUrlRaw.split(',') : turnUrlRaw;
      iceServers.push({
        urls: turnUrls,
        username: username,
        credential: credential
      });
    } else if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
      const turnUrlRaw = process.env.TURN_URL;
      const turnUrls = turnUrlRaw.includes(',') ? turnUrlRaw.split(',') : turnUrlRaw;
      iceServers.push({
        urls: turnUrls,
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_CREDENTIAL
      });
    }

    res.json({
      success: true,
      iceServers
    });
  });
});

/**
 * POST /api/calls/feedback
 * 
 * Submits optional call quality feedback rating and issues checklist.
 */
router.post('/feedback', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { callId, rating, issues, comments } = req.body;

  if (!callId || !rating) {
    return res.status(400).json({ error: 'Missing required parameters callId or rating.' });
  }

  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
  }

  try {
    // Assert the call exists and the user was a participant
    const checkCall = await query(
      `SELECT id FROM calls WHERE id = $1 AND (caller_id = $2 OR receiver_id = $2)`,
      [callId, userId]
    );

    if (checkCall.rowCount === 0) {
      return res.status(404).json({ error: 'Call log not found or you are not a participant in this call.' });
    }

    // Insert feedback (issues is an array or null)
    await query(
      `INSERT INTO call_feedback (call_id, user_id, rating, issues, comments)
       VALUES ($1, $2, $3, $4, $5)`,
      [callId, userId, numericRating, issues || [], comments || '']
    );

    res.json({
      success: true,
      message: 'Feedback submitted successfully.'
    });
  } catch (err) {
    console.error('Error submitting call feedback:', err);
    res.status(500).json({ error: 'Server error submitting call feedback.' });
  }
});

export default router;
