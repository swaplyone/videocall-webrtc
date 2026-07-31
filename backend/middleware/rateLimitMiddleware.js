const rateLimitMap = new Map();

/**
 * Creates an Express middleware for rate limiting.
 * @param {object} options 
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 mins)
 * @param {number} options.max - Max requests per IP in the window
 * @param {string} options.message - Error message to return
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests, please try again later.'
} = {}) {
  // Clean up expired entries periodically to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
      if (now > data.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    // Resolve IP address taking proxies into account
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, {
        hits: 1,
        resetTime: now + windowMs
      });
    } else {
      const data = rateLimitMap.get(ip);
      if (now > data.resetTime) {
        // Window expired, reset window
        data.hits = 1;
        data.resetTime = now + windowMs;
      } else {
        data.hits++;
      }
    }

    const clientData = rateLimitMap.get(ip);
    const remaining = Math.max(0, max - clientData.hits);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));

    if (clientData.hits > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}
