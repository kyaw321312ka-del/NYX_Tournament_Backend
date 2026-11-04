const multer = require('multer');
const TournamentError = require('../../domain/errors/TournamentError');

const MAX_BANNER_SIZE = 10 * 1024 * 1024;
const parseMultipart = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_BANNER_SIZE,
        files: 1,
    },
}).single('banner');

function parseTournamentMultipart(req, res, next) {
    if (!req.is('multipart/form-data')) {
        return next();
    }

    return parseMultipart(req, res, (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                const message = error.code === 'LIMIT_FILE_SIZE'
                    ? 'Tournament banner must be 10 MB or smaller.'
                    : 'Invalid tournament upload.';
                return next(new TournamentError(statusCode, message));
            }
            return next(error);
        }

        req.body = req.body || {};
        if (typeof req.body.tournament !== 'string') {
            return next(new TournamentError(
                400,
                'Multipart requests must include a "tournament" text field containing the tournament JSON.',
            ));
        }

        let tournament;
        try {
            tournament = JSON.parse(req.body.tournament);
        } catch {
            return next(new TournamentError(400, 'The "tournament" field must contain valid JSON.'));
        }

        if (!tournament || typeof tournament !== 'object' || Array.isArray(tournament)) {
            return next(new TournamentError(400, 'The "tournament" field must contain a JSON object.'));
        }

        req.body = tournament;
        return next();
    });
}

module.exports = parseTournamentMultipart;
