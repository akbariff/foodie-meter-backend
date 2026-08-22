const { validationResult } = require('express-validator');
const AppError = require('./AppError');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fields = {};
    for (const err of errors.array()) {
      const key = err.path || err.param || 'general';
      if (!fields[key]) fields[key] = err.msg;
    }
    return next(new AppError(400, 'Request validation failed', 'VALIDATION_ERROR', fields));
  }
  next();
}

module.exports = validate;
