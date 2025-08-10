const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');
const redisClient = require('./redis-client');
const { logAuth } = require('./logging');

// JWT token verification middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Check if token exists in Redis (active session)
    const sessionData = await redisClient.getUserSession(token);
    if (!sessionData) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Attach user info to request
    req.user = {
      username: decoded.username,
      isAdmin: decoded.isAdmin
    };
    
    next();
  } catch (error) {
    logAuth('TOKEN_VERIFICATION_FAILED', req.headers.authorization, false, { error: error.message });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    logAuth('UNAUTHORIZED_ADMIN_ACCESS', req.user.username, false);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Password verification helper
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      username: user.username, 
      isAdmin: user.is_admin === 1 
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES }
  );
};

module.exports = {
  verifyToken,
  requireAdmin,
  verifyPassword,
  generateToken
};
