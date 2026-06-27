import * as db from '../db/client.js';

export async function authenticate(req, res, next) {
  const token = req.cookies?.session;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const result = await db.query(`
      SELECT u.* FROM users u
      JOIN sessions s ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > NOW()
    `, [token]);

    req.user = result.rows[0] ?? null;
  } catch (err) {
    console.error('Session authentication error:', err);
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized', redirect: '/login' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}

export function requireSetup(req, res, next) {
  if (req.user && !req.user.setup_complete) {
    return res.status(403).json({ error: 'setup_required', redirect: '/setup/llm' });
  }
  next();
}
