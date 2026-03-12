const jwt = require('jsonwebtoken');
const { getDb } = require('../database/db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await getDb();
    const user = await db.get(
      'SELECT id, name, email, role, phone, address, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid or inactive account' });
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    return res.status(500).json({ error: err.message });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, authorize };
