import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/chat/history/:targetUsername
 * 
 * Retrieves message history between current authenticated user and targetUsername.
 */
router.get('/history/:targetUsername', authenticateToken, async (req, res) => {
  const currentUserId = req.user.id;
  const targetUsername = req.params.targetUsername;

  try {
    // Find target user ID
    const targetUserRes = await query('SELECT id FROM users WHERE username = $1', [targetUsername]);
    if (targetUserRes.rowCount === 0) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    const targetUserId = targetUserRes.rows[0].id;

    // Verify friendship
    const friendshipCheck = await query(
      `SELECT 1 FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) 
          OR (user_id = $2 AND friend_id = $1)`,
      [currentUserId, targetUserId]
    );
    if (friendshipCheck.rowCount === 0) {
      return res.status(403).json({ error: 'You can only view chat history with accepted friends' });
    }

    // Check if conversation exists
    const existRes = await query(
      `SELECT cm1.conversation_id 
       FROM conversation_members cm1
       JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2`,
      [currentUserId, targetUserId]
    );

    if (existRes.rowCount === 0) {
      return res.json({ success: true, messages: [] });
    }
    const convId = existRes.rows[0].conversation_id;

    // Load message history
    const msgRes = await query(
      `SELECT m.id, m.message AS text, u.username AS sender, m.created_at AS timestamp
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1 AND m.moderation_status = 'APPROVED'
       ORDER BY m.created_at ASC`,
      [convId]
    );

    // Format timestamps for client display
    const formattedMessages = msgRes.rows.map(row => ({
      id: row.id,
      text: row.text,
      sender: row.sender,
      timestamp: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    res.json({
      success: true,
      messages: formattedMessages
    });

  } catch (err) {
    console.error('Error loading chat history:', err);
    res.status(500).json({ error: 'Server error loading chat history' });
  }
});

export default router;
