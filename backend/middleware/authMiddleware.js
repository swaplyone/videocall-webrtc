import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'swaply_jwt_access_secret_key_12345';

/**
 * Express middleware to authenticate and authorize HTTP requests using JWT Bearer tokens.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Expecting format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    
    // Inject decoded user parameters into request
    req.user = decoded;
    next();
  });
}
