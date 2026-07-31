/**
 * Express middleware to inject essential security headers into every response.
 * Follows OWASP recommendations to prevent MIME sniffing, Clickjacking, XSS, and frame injections.
 */
export function securityHeaders(req, res, next) {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent Clickjacking (disallow page embedding in iframe/frame)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection in legacy browsers (block mode)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information sent in headers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Basic Content Security Policy (allows loading only from self and essential sources)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; img-src 'self' data:; frame-ancestors 'none';"
  );
  
  next();
}
