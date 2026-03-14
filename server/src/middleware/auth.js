import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'practice-forge-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

/**
 * Create a JWT token for a user
 */
export function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, display_name: user.display_name },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware — requires valid JWT in Authorization header or pf_token cookie.
 * Skips auth in dev mode if AUTH_REQUIRED is not set.
 */
export function requireAuth(req, res, next) {
  // Dev mode bypass — if AUTH_REQUIRED is not 'true', allow unauthenticated requests
  if (process.env.AUTH_REQUIRED !== 'true') {
    req.user = { id: 'dev-user', email: 'dev@practiceforge.local', display_name: 'Dev User' };
    return next();
  }

  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.pf_token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't reject if missing
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.pf_token;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      // Invalid token — proceed without user
    }
  }

  if (!req.user && process.env.AUTH_REQUIRED !== 'true') {
    req.user = { id: 'dev-user', email: 'dev@practiceforge.local', display_name: 'Dev User' };
  }

  next();
}
