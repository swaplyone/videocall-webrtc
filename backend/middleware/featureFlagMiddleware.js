import { isFeatureEnabled } from '../services/featureFlagService.js';

/**
 * Middleware to restrict endpoints based on feature flag status
 */
export function requireFeatureFlag(flagKey) {
  return async (req, res, next) => {
    try {
      const enabled = await isFeatureEnabled(flagKey);
      if (!enabled) {
        return res.status(503).json({
          success: false,
          error: `Feature '${flagKey}' is currently disabled for maintenance or feature rollout.`,
          flag: flagKey
        });
      }
      next();
    } catch (err) {
      next();
    }
  };
}
