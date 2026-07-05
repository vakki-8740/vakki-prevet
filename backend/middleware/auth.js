const { verifyToken, getTokenFromHeader } = require('../utils/token');

function authMiddleware(db) {
  return (req, res, next) => {
    try {
      const token = getTokenFromHeader(req.headers.authorization);
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const decoded = verifyToken(token);
      const user = db.prepare('SELECT id, name, email, avatar, storage_used, storage_limit, theme, language, created_at FROM users WHERE id = ?').get(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

module.exports = authMiddleware;
