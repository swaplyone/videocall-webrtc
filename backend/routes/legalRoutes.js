import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { logActivity } from '../services/auditLogService.js';

const router = express.Router();

const DEFAULT_POLICIES = {
  PRIVACY: {
    title: 'Privacy Policy',
    version: '1.0.0',
    content: `Swaply Privacy Policy\n\nEffective Date: August 2026\n\n1. Data We Collect: We collect minimal account identifiers (username, email, beta ID), encryption tokens, and optional profile metadata to facilitate secure WebRTC video calls and chat.\n2. How We Use Data: Your data is used exclusively to operate real-time peer-to-peer video streams, friend discovery, and platform security.\n3. Encryption & Media: Peer-to-peer video calls are end-to-end encrypted via WebRTC DTLS-SRTP. Stream media is never recorded or stored on central servers.\n4. Data Retention & Deletion: You retain full ownership of your data and can request a complete export or permanent deletion of your account personal data at any time.`
  },
  TERMS: {
    title: 'Terms of Service',
    version: '1.0.0',
    content: `Swaply Terms of Service\n\nEffective Date: August 2026\n\n1. User Agreement: By registering or using Swaply, you agree to comply with our Terms of Service and Community Guidelines.\n2. Acceptable Use: You must be at least 18 years old or meet legal age requirements. Unauthorized recording, harassment, spam, and reverse engineering are strictly prohibited.\n3. Service Availability: Swaply reserves the right to modify, suspend, or terminate service or feature flags during beta releases.`
  },
  COMMUNITY: {
    title: 'Community Guidelines',
    version: '1.0.0',
    content: `Swaply Community Guidelines\n\n1. Respect & Safety: Treat all members with respect. Zero tolerance for hate speech, harassment, bullying, or abusive behavior.\n2. Privacy Respect: Do not attempt to bypass picture-in-picture privacy controls or take unauthorized screenshots during calls.\n3. Reporting: Use in-app reporting tools to report any misconduct immediately.`
  },
  COOKIES: {
    title: 'Cookie Policy',
    version: '1.0.0',
    content: `Swaply Cookie Policy\n\n1. Essential Cookies: We use essential session cookies and local storage tokens strictly required for authentication and security.\n2. No Tracking: Swaply does not use third-party cross-site advertising cookies.`
  }
};

// GET /api/legal/policies - Get active policy documents and version info
router.get('/policies', async (req, res) => {
  try {
    const result = await query('SELECT * FROM legal_policy_versions ORDER BY policy_type');
    const dbPolicies = {};
    result.rows.forEach((row) => {
      dbPolicies[row.policy_type] = {
        title: row.title,
        version: row.version,
        content: row.content,
        effectiveDate: row.effective_date
      };
    });

    const policies = {
      PRIVACY: dbPolicies.PRIVACY || DEFAULT_POLICIES.PRIVACY,
      TERMS: dbPolicies.TERMS || DEFAULT_POLICIES.TERMS,
      COMMUNITY: dbPolicies.COMMUNITY || DEFAULT_POLICIES.COMMUNITY,
      COOKIES: dbPolicies.COOKIES || DEFAULT_POLICIES.COOKIES
    };

    return res.json({ success: true, policies });
  } catch (err) {
    console.error('Error fetching legal policies:', err);
    return res.json({ success: true, policies: DEFAULT_POLICIES });
  }
});

// GET /api/legal/consent - Get current user consent history
router.get('/consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      'SELECT policy_type, version, consented_at FROM user_consents WHERE user_id = $1 ORDER BY consented_at DESC',
      [userId]
    );
    const consents = {};
    result.rows.forEach((row) => {
      if (!consents[row.policy_type]) {
        consents[row.policy_type] = row;
      }
    });
    return res.json({ success: true, consents });
  } catch (err) {
    console.error('Error fetching user consents:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user consents' });
  }
});

// POST /api/legal/consent - Submit consent for policy version
router.post('/consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { policyType, version } = req.body;
    if (!policyType || !version) {
      return res.status(400).json({ success: false, error: 'policyType and version are required' });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

    await query(
      'INSERT INTO user_consents (user_id, policy_type, version, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, policyType, version, ipAddress]
    );

    await logActivity(userId, 'USER_CONSENT_GIVEN', { policyType, version }, ipAddress, req.headers['user-agent']);

    return res.json({ success: true, message: `Consent recorded for ${policyType} version ${version}` });
  } catch (err) {
    console.error('Error recording consent:', err);
    return res.status(500).json({ success: false, error: 'Failed to record consent' });
  }
});

// POST /api/legal/export-data - Request complete personal data export (GDPR)
router.post('/export-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await query(
      'SELECT id, security_id, name, username, email, created_at, beta_id, notice_accepted FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userRes.rows[0];

    const [callsRes, friendsRes, consentsRes, sessionsRes] = await Promise.all([
      query('SELECT id, caller_id, receiver_id, status, started_at, ended_at, duration FROM calls WHERE caller_id = $1 OR receiver_id = $1', [userId]),
      query('SELECT friend_id, created_at FROM friendships WHERE user_id = $1', [userId]),
      query('SELECT policy_type, version, consented_at FROM user_consents WHERE user_id = $1', [userId]),
      query('SELECT device_name, browser, os, ip_address, created_at FROM user_sessions WHERE user_id = $1', [userId])
    ]);

    const exportBundle = {
      exportTimestamp: new Date().toISOString(),
      profile: user,
      callHistoryCount: callsRes.rows.length,
      calls: callsRes.rows,
      friendsCount: friendsRes.rows.length,
      friends: friendsRes.rows,
      consents: consentsRes.rows,
      sessions: sessionsRes.rows
    };

    await logActivity(userId, 'DATA_EXPORT_REQUEST', { format: 'json' }, req.ip, req.headers['user-agent']);

    return res.json({
      success: true,
      message: 'Personal data export prepared successfully',
      data: exportBundle
    });
  } catch (err) {
    console.error('Error exporting user data:', err);
    return res.status(500).json({ success: false, error: 'Failed to export user data' });
  }
});

// POST /api/legal/delete-personal-data - Request personal data deletion (GDPR)
router.post('/delete-personal-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30-day grace period

    await query(
      `UPDATE users SET deletion_status = 'PENDING_DELETION', deletion_requested_at = CURRENT_TIMESTAMP, scheduled_deletion_at = $1, deletion_reason = $2 WHERE id = $3`,
      [scheduledDate, reason || 'User GDPR Personal Data Deletion Request', userId]
    );

    await query(
      `INSERT INTO account_deletion_requests (user_id, username, email, deletion_reason, scheduled_deletion_at, ip_address)
       SELECT id, username, email, $1, $2, $3 FROM users WHERE id = $4`,
      [reason || 'User GDPR Personal Data Deletion Request', scheduledDate, req.ip, userId]
    );

    await logActivity(userId, 'DATA_DELETE_REQUEST', { scheduledDeletionAt: scheduledDate }, req.ip, req.headers['user-agent']);

    return res.json({
      success: true,
      message: 'Personal data deletion requested successfully. Account queued for 30-day deletion grace period.',
      scheduledDeletionAt: scheduledDate
    });
  } catch (err) {
    console.error('Error requesting data deletion:', err);
    return res.status(500).json({ success: false, error: 'Failed to request data deletion' });
  }
});

export default router;
