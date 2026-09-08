const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/db');
const AppError = require('./AppError');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return next(new AppError(401, 'Invalid or expired token'));
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return next(new AppError(401, 'Invalid or expired token'));
    }
    if (!user.isVerified) {
      return next(new AppError(403, 'Please verify your email before continuing', 'EMAIL_NOT_VERIFIED'));
    }
    if (user.status !== 'ACTIVE') {
      return next(new AppError(403, 'This account has been suspended', 'ACCOUNT_SUSPENDED'));
    }

    req.user = {
      id: user.id,
      role: user.role,
      subscriptionTier: user.subscriptionTier,
      status: user.status,
      isVerified: user.isVerified,
      assignedCategory: user.assignedCategory,
    };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
