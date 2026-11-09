const HttpError = require('../../../../shared/errors/HttpError');

class PaymentError extends HttpError {
    constructor(statusCode, message) {
        super(statusCode, message);
        this.name = 'PaymentError';
    }
}

module.exports = PaymentError;
