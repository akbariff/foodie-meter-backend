const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('./AppError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

module.exports = requireAuth;
