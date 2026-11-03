const express = require('express');
const multer = require('multer');
const validate = require('../middleware/validateTournamentRequest');
const TournamentError = require('../../domain/errors/TournamentError');

const MAX_BANNER_SIZE = 10 * 1024 * 1024;
const parseBanner = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_BANNER_SIZE,
        files: 1,
    },
}).single('banner');

function createTournamentRouter({
    controller,
    schemas,
    authenticate,
    optionalAuthenticate,
}) {
    const router = express.Router();
    const handleBannerUpload = (req, res, next) => {
        parseBanner(req, res, (error) => {
            if (!error) {
                if (!req.file) {
                    return next(new TournamentError(400, 'Provide a banner file in the "banner" form field.'));
                }
                return next();
            }

            if (error instanceof multer.MulterError) {
                const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                const message = error.code === 'LIMIT_FILE_SIZE'
                    ? 'Tournament banner must be 10 MB or smaller.'
                    : 'Invalid tournament banner upload.';
                return next(new TournamentError(statusCode, message));
            }
            return next(error);
        });
    };

    router.get('/', optionalAuthenticate, validate(schemas.listTournamentsSchema, 'query'), controller.list);
    router.get('/:id', optionalAuthenticate, validate(schemas.tournamentIdSchema, 'params'), controller.get);
    router.post('/', authenticate, validate(schemas.createTournamentSchema), controller.create);
    router.put(
        '/:id/banner',
        authenticate,
        validate(schemas.tournamentIdSchema, 'params'),
        handleBannerUpload,
        controller.updateBanner,
    );
    router.put(
        '/:id',
        authenticate,
        validate(schemas.tournamentIdSchema, 'params'),
        validate(schemas.updateTournamentSchema),
        controller.update,
    );
    router.post(
        '/:id/publish',
        authenticate,
        validate(schemas.tournamentIdSchema, 'params'),
        controller.publish,
    );
    router.delete(
        '/:id',
        authenticate,
        validate(schemas.tournamentIdSchema, 'params'),
        controller.remove,
    );

    return router;
}

module.exports = createTournamentRouter;
