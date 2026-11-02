const HttpError = require('../../../../shared/errors/HttpError');

class RegistrationError extends HttpError {
    constructor(statusCode, message) {
        super(statusCode, message);
        this.name = 'RegistrationError';
    }
}

module.exports = RegistrationError;
