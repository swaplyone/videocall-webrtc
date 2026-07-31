import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper: Get user by username or Beta ID
async function getUserByIdentifier(target) {
  const cleanTarget = target.trim();
  const res = await query(
    'SELECT id, username, name, beta_id, profile_image, allow_requests, searchable, qr_active FROM users WHERE username = $1 OR beta_id = $2',
    [cleanTarget.toLowerCase(), cleanTarget.toUpperCase()]
  );
  return res.rowCount > 0 ? res.rows[0] : null;
}

// Helper: Check if blocking relationship exists
async function checkBlockRelation(userId1, userId2) {
  const res = await query(
    'SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_user_id = $2) OR (blocker_id = $2 AND blocked_user_id = $1)',
    [userId1, userId2]
  );
  return res.rowCount > 0;
}

// Helper: Get username by user ID
async function getUsernameById(userId) {
  const res = await query('SELECT username FROM users WHERE id = $1', [userId]);
  return res.rowCount > 0 ? res.rows[0].username : null;
}

// Helper: Socket emitter
function notifyUser(req, targetUsername, event, data) {
  const io = req.app.get('socketio');
  const onlineUsers = req.app.get('onlineUsers');
  if (io && onlineUsers) {
    const socketId = onlineUsers.get(targetUsername);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  }
}

// 1. Search Users (Module 3)
router.get('/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    let cleanQ = q.trim();
    if (cleanQ.startsWith('@')) {
      cleanQ = cleanQ.substring(1);
    }

    // Allow searching for exact username/beta_id or partial if searchable
    const searchRes = await query(
      `SELECT name, username, beta_id, profile_image, online_status
       FROM users
       WHERE (
         username = $1 OR beta_id = $2 OR 
         (searchable = true AND (username ILIKE $3 OR name ILIKE $3))
       ) AND id <> $4`,
      [cleanQ.toLowerCase(), cleanQ.toUpperCase(), `%${cleanQ}%`, req.user.id]
    );

    res.json({ success: true, results: searchRes.rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error during search' });
  }
});

// 2. Send Friend Request (Module 2 & 11)
router.post('/request', authenticateToken, async (req, res) => {
  const { target } = req.body;
  if (!target) {
    return res.status(400).json({ error: 'Target user identifier required' });
  }

  try {
    const targetUser = await getUserByIdentifier(target);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot send a friend request to yourself' });
    }

    if (!targetUser.allow_requests) {
      return res.status(403).json({ error: 'This user is not accepting friend requests' });
    }

    // Check block relationship
    const isBlocked = await checkBlockRelation(req.user.id, targetUser.id);
    if (isBlocked) {
      return res.status(403).json({ error: 'Friend request blocked by privacy relationships' });
    }

    // Check already friends
    const checkFriendship = await query(
      'SELECT 1 FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)',
      [req.user.id, targetUser.id]
    );
    if (checkFriendship.rowCount > 0) {
      return res.status(400).json({ error: 'You are already friends with this user' });
    }

    // Check pending request (either direction)
    const checkPending = await query(
      `SELECT id, sender_id FROM friend_requests 
       WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
       AND status = 'PENDING'`,
      [req.user.id, targetUser.id]
    );

    if (checkPending.rowCount > 0) {
      if (checkPending.rows[0].sender_id === req.user.id) {
        return res.status(400).json({ error: 'A pending friend request already exists' });
      } else {
        return res.status(400).json({ error: 'This user has already sent you a friend request' });
      }
    }

    // Create the request
    const insertRes = await query(
      `INSERT INTO friend_requests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'PENDING') RETURNING id`,
      [req.user.id, targetUser.id]
    );

    const reqId = insertRes.rows[0].id;

    // Send real-time notification
    notifyUser(req, targetUser.username, 'friend_request_received', {
      id: reqId,
      sender: req.user.username,
      senderName: req.user.name || req.user.username
    });

    res.json({ success: true, message: 'Friend request sent', requestId: reqId });
  } catch (err) {
    console.error('Request error:', err);
    res.status(500).json({ error: 'Server error sending request' });
  }
});

// 3. Get Requests (Module 2)
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const incoming = await query(
      `SELECT r.id, u.username, u.name, u.beta_id, u.profile_image, r.created_at
       FROM friend_requests r
       JOIN users u ON r.sender_id = u.id
       WHERE r.receiver_id = $1 AND r.status = 'PENDING'`,
      [req.user.id]
    );

    const outgoing = await query(
      `SELECT r.id, u.username, u.name, u.beta_id, u.profile_image, r.created_at
       FROM friend_requests r
       JOIN users u ON r.receiver_id = u.id
       WHERE r.sender_id = $1 AND r.status = 'PENDING'`,
      [req.user.id]
    );

    res.json({ success: true, incoming: incoming.rows, outgoing: outgoing.rows });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Server error retrieving requests' });
  }
});

// 4. Accept Request (Module 2 & 11)
router.post('/request/:id/accept', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Start transactional accept
    await query('BEGIN');

    const reqRes = await query(
      'SELECT sender_id, receiver_id, status FROM friend_requests WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (reqRes.rowCount === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = reqRes.rows[0];
    if (request.receiver_id !== req.user.id) {
      await query('ROLLBACK');
      return res.status(403).json({ error: 'Unauthorized to accept this request' });
    }

    if (request.status !== 'PENDING') {
      await query('ROLLBACK');
      return res.status(400).json({ error: `Request already resolved: ${request.status}` });
    }

    // Double check blocker state
    const isBlocked = await checkBlockRelation(request.sender_id, request.receiver_id);
    if (isBlocked) {
      await query('ROLLBACK');
      return res.status(403).json({ error: 'Cannot accept request. A block relation exists.' });
    }

    // Update request
    await query(
      "UPDATE friend_requests SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Insert friendship
    await query(
      `INSERT INTO friendships (user_id, friend_id)
       VALUES (LEAST($1::integer, $2::integer), GREATEST($1::integer, $2::integer))
       ON CONFLICT DO NOTHING`,
      [request.sender_id, request.receiver_id]
    );

    await query('COMMIT');

    // Notify sender
    const senderUsername = await getUsernameById(request.sender_id);
    if (senderUsername) {
      notifyUser(req, senderUsername, 'friend_request_accepted', {
        receiver: req.user.username,
        receiverName: req.user.name || req.user.username
      });
    }

    res.json({ success: true, message: 'Friend request accepted' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Accept error:', err);
    res.status(500).json({ error: 'Server error accepting request' });
  }
});

// 5. Reject Request (Module 2)
router.post('/request/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const reqRes = await query(
      'SELECT sender_id, receiver_id, status FROM friend_requests WHERE id = $1',
      [id]
    );

    if (reqRes.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = reqRes.rows[0];
    if (request.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to reject this request' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Request already resolved: ${request.status}` });
    }

    await query(
      "UPDATE friend_requests SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Notify sender
    const senderUsername = await getUsernameById(request.sender_id);
    if (senderUsername) {
      notifyUser(req, senderUsername, 'friend_request_rejected', {
        receiver: req.user.username
      });
    }

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Server error rejecting request' });
  }
});

// 6. Cancel Pending Request (Module 2)
router.delete('/request/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const reqRes = await query(
      'SELECT sender_id, receiver_id, status FROM friend_requests WHERE id = $1',
      [id]
    );

    if (reqRes.rowCount === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    const request = reqRes.rows[0];
    if (request.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this request' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Request already resolved: ${request.status}` });
    }

    await query(
      "UPDATE friend_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    res.json({ success: true, message: 'Friend request cancelled' });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Server error cancelling request' });
  }
});

// 7. Remove Friend (Module 2)
router.delete('/:userId', authenticateToken, async (req, res) => {
  const friendId = parseInt(req.params.userId, 10);
  if (isNaN(friendId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    await query('BEGIN');

    // Delete friendship
    const delFriendship = await query(
      `DELETE FROM friendships 
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
      [req.user.id, friendId]
    );

    // Cancel/clean requests
    await query(
      `UPDATE friend_requests 
       SET status = 'CANCELLED' 
       WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
      [req.user.id, friendId]
    );

    await query('COMMIT');

    // Notify peer
    const peerUsername = await getUsernameById(friendId);
    if (peerUsername) {
      notifyUser(req, peerUsername, 'friend_removed', {
        exFriend: req.user.username
      });
    }

    res.json({ success: true, message: 'Friend removed' });
  } catch (err) {
    await query('ROLLBACK');
    console.error('Remove friend error:', err);
    res.status(500).json({ error: 'Server error removing friend' });
  }
});

// 8. Get Friends list (Module 2)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const friends = await query(
      `SELECT u.id, u.name, u.username, u.beta_id, u.profile_image, u.online_status
       FROM friendships f
       JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id)
       WHERE (f.user_id = $1 OR f.friend_id = $1) AND u.id <> $1`,
      [req.user.id]
    );
    res.json({ success: true, friends: friends.rows });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ error: 'Server error retrieving friends' });
  }
});

// 9. Get QR Token (Module 4)
router.get('/qr', authenticateToken, async (req, res) => {
  try {
    const userRes = await query('SELECT qr_token, qr_active FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { qr_token, qr_active } = userRes.rows[0];
    res.json({
      success: true,
      qr_token,
      qr_active,
      inviteUrl: `swaply://friend/${qr_token}`
    });
  } catch (err) {
    console.error('Get QR token error:', err);
    res.status(500).json({ error: 'Server error retrieving QR' });
  }
});

// 10. Resolve QR Token (Module 4)
router.get('/qr/resolve/:token', authenticateToken, async (req, res) => {
  const { token } = req.params;

  try {
    const userRes = await query(
      'SELECT id, name, username, beta_id, profile_image, qr_active FROM users WHERE qr_token = $1',
      [token]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Invalid QR invitation token' });
    }

    const targetUser = userRes.rows[0];
    if (!targetUser.qr_active) {
      return res.status(403).json({ error: 'This QR invitation is no longer active' });
    }

    res.json({
      success: true,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        username: targetUser.username,
        beta_id: targetUser.beta_id,
        profile_image: targetUser.profile_image
      }
    });
  } catch (err) {
    console.error('Resolve QR error:', err);
    res.status(500).json({ error: 'Server error resolving QR invitation' });
  }
});

// 11. Update Privacy Options (Module 12)
router.put('/privacy', authenticateToken, async (req, res) => {
  const { searchable, allow_requests, show_beta_id, qr_active } = req.body;

  try {
    await query(
      `UPDATE users
       SET searchable = COALESCE($1, searchable),
           allow_requests = COALESCE($2, allow_requests),
           show_beta_id = COALESCE($3, show_beta_id),
           qr_active = COALESCE($4, qr_active)
       WHERE id = $5`,
      [searchable, allow_requests, show_beta_id, qr_active, req.user.id]
    );

    res.json({ success: true, message: 'Privacy options updated successfully' });
  } catch (err) {
    console.error('Privacy update error:', err);
    res.status(500).json({ error: 'Server error updating privacy options' });
  }
});

export default router;
