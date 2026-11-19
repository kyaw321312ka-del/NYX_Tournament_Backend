const express = require('express');
const validate = require('../middleware/validateTournamentRequest');
const parseTournamentMultipart = require('../middleware/parseTournamentMultipart');

function createTournamentRouter({
    controller,
    schemas,
    authenticate,
    requireAdmin,
    optionalAuthenticate,
}) {
    const router = express.Router();

    router.get('/', optionalAuthenticate, validate(schemas.listTournamentsSchema, 'query'), controller.list);
    router.get('/:id', optionalAuthenticate, validate(schemas.tournamentIdSchema, 'params'), controller.get);
    router.post('/', authenticate, requireAdmin, parseTournamentMultipart, validate(schemas.createTournamentSchema), controller.create);
    router.put(
        '/:id',
        authenticate,
        requireAdmin,
        parseTournamentMultipart,
        validate(schemas.tournamentIdSchema, 'params'),
        validate(schemas.updateTournamentSchema),
        controller.update,
    );
    router.post(
        '/:id/publish',
        authenticate,
        requireAdmin,
        validate(schemas.tournamentIdSchema, 'params'),
        controller.publish,
    );
    router.delete(
        '/:id',
        authenticate,
        requireAdmin,
        validate(schemas.tournamentIdSchema, 'params'),
        controller.remove,
    );

    return router;
}

module.exports = createTournamentRouter;
