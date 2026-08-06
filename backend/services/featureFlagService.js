import { query } from '../db.js';

const DEFAULT_FLAGS = {
  video_calls: { enabled: true, description: 'Peer-to-peer WebRTC video calls', category: 'core' },
  chat: { enabled: true, description: 'Text messaging and chat channels', category: 'core' },
  friends: { enabled: true, description: 'Friend requests and user discovery', category: 'social' },
  qr_scanner: { enabled: true, description: 'QR code profile scanning & validation', category: 'social' },
  swipe_requests: { enabled: true, description: 'Swipe requests for instant matching', category: 'social' },
  otp: { enabled: true, description: 'Email OTP code authentication & verification', category: 'security' },
  email_service: { enabled: true, description: 'SMTP email notifications service', category: 'communication' },
  rollout_system: { enabled: true, description: 'Beta waitlist batch rollout system', category: 'beta' },
  screenshot_detection: { enabled: true, description: 'Picture-in-picture privacy and screenshot alerts', category: 'privacy' },
  privacy_center: { enabled: true, description: 'User privacy controls and reporting center', category: 'privacy' },
  analytics: { enabled: true, description: 'Platform telemetry and call quality metrics', category: 'monitoring' },
  diagnostics: { enabled: true, description: 'Network, ICE, and device diagnostics', category: 'monitoring' },
  feedback: { enabled: true, description: 'Call quality and general feedback collection', category: 'user_experience' },
  landing_website: { enabled: true, description: 'Public landing page website rendering', category: 'public' }
};

/**
 * Initialize default feature flags in DB if missing
 */
export async function initFeatureFlags() {
  for (const [key, meta] of Object.entries(DEFAULT_FLAGS)) {
    try {
      await query(
        `INSERT INTO feature_flags (key, enabled, description, category)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [key, meta.enabled, meta.description, meta.category]
      );
    } catch (err) {
      // Ignore conflict
    }
  }
}

/**
 * Get all feature flags
 */
export async function getFeatureFlags() {
  await initFeatureFlags();
  try {
    const res = await query('SELECT key, enabled, description, category, updated_at FROM feature_flags');
    const flags = {};
    res.rows.forEach(row => {
      flags[row.key] = row.enabled;
    });
    return flags;
  } catch (err) {
    // Fallback to default flags
    const flags = {};
    Object.keys(DEFAULT_FLAGS).forEach(k => { flags[k] = DEFAULT_FLAGS[k].enabled; });
    return flags;
  }
}

/**
 * Check if a single flag is enabled
 */
export async function isFeatureEnabled(flagKey) {
  try {
    const res = await query('SELECT enabled FROM feature_flags WHERE key = $1', [flagKey]);
    if (res.rows.length === 0) {
      return DEFAULT_FLAGS[flagKey] ? DEFAULT_FLAGS[flagKey].enabled : true;
    }
    return res.rows[0].enabled;
  } catch (err) {
    return DEFAULT_FLAGS[flagKey] ? DEFAULT_FLAGS[flagKey].enabled : true;
  }
}

/**
 * Toggle or update feature flag
 */
export async function setFeatureFlag(flagKey, enabled, adminId = null) {
  await query(
    `INSERT INTO feature_flags (key, enabled, updated_at, updated_by)
     VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
     ON CONFLICT (key) DO UPDATE SET enabled = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3`,
    [flagKey, Boolean(enabled), adminId]
  );
  return true;
}
