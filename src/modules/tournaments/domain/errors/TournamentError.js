const HttpError = require('../../../../shared/errors/HttpError');

class TournamentError extends HttpError {
    constructor(statusCode, message) {
        super(statusCode, message);
        this.name = 'TournamentError';
    }
}

module.exports = TournamentError;
