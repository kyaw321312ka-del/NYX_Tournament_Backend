const HttpError = require('../../../../shared/errors/HttpError');

class AuthError extends HttpError {
  constructor(statusCode, message) {
    super(statusCode, message);
    this.name = 'AuthError';
  }
}

module.exports = AuthError;
