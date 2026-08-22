class AppError extends Error {
  constructor(statusCode, message, code, fields) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || defaultCodeFor(statusCode);
    this.fields = fields;
  }
}

function defaultCodeFor(statusCode) {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    default:
      return 'INTERNAL_ERROR';
  }
}

module.exports = AppError;
