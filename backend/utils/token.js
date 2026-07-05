const jwt = require('jsonwebtoken');
const config = require('../config/config');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

function getTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

module.exports = { generateToken, verifyToken, getTokenFromHeader };
