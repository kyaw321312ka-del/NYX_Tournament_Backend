const TournamentError = require('../../domain/errors/TournamentError');

function validateTournamentRequest(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            const details = result.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join('; ');
            return next(new TournamentError(400, details));
        }
        req[`validated${source[0].toUpperCase()}${source.slice(1)}`] = result.data;
        return next();
    };
}

module.exports = validateTournamentRequest;
