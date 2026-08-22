const AppError = require('./AppError');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN_ROLE'));
    }
    next();
  };
}

function requireTier(...tiers) {
  return (req, res, next) => {
    if (!req.user || !tiers.includes(req.user.subscriptionTier)) {
      return next(new AppError(403, 'This feature requires a different subscription tier', 'FORBIDDEN_TIER'));
    }
    next();
  };
}

module.exports = { requireRole, requireTier };
