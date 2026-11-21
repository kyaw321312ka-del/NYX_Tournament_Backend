const express = require('express');
const validate = require('../../../../shared/middleware/validateRequest');

function createDrawRouter({ controller, schemas, authenticate, requireAdmin }) {
    const router = express.Router();

    router.get('/draw-configurations/options', controller.listConfigurationOptions);
    router.get(
        '/admin/draw-configurations',
        authenticate,
        requireAdmin,
        controller.listDrawConfigurations,
    );
    router.get(
        '/admin/tournament-categories/:categoryId/draw-configuration',
        authenticate,
        requireAdmin,
        validate(schemas.categoryIdSchema, 'params'),
        controller.getDrawConfiguration,
    );
    router.get(
        '/tournament-categories/:categoryId/draw',
        validate(schemas.categoryIdSchema, 'params'),
        controller.getPublishedDraw,
    );
    router.get(
        '/tournament-categories/:categoryId/leaderboard',
        validate(schemas.categoryIdSchema, 'params'),
        controller.getCategoryLeaderboard,
    );
    router.get(
        '/admin/tournament-categories/:categoryId/eligible-registrations',
        authenticate,
        requireAdmin,
        validate(schemas.categoryIdSchema, 'params'),
        controller.listEligibleRegistrations,
    );
    router.get(
        '/admin/tournament-categories/:categoryId/ranking-point-awards',
        authenticate,
        requireAdmin,
        validate(schemas.categoryIdSchema, 'params'),
        controller.listRankingPointAwards,
    );
    router.post(
        '/admin/tournament-categories/:categoryId/draws',
        authenticate,
        requireAdmin,
        validate(schemas.categoryIdSchema, 'params'),
        validate(schemas.createDrawSchema),
        controller.createDraft,
    );
    router.get(
        '/admin/tournament-categories/:categoryId/draws',
        authenticate,
        requireAdmin,
        validate(schemas.categoryIdSchema, 'params'),
        controller.getLatestDraw,
    );
    router.get(
        '/admin/tournament-categories/:categoryId/draws/:drawId',
        authenticate,
        requireAdmin,
        validate(schemas.categoryAndDrawIdSchema, 'params'),
        controller.getDraw,
    );
    router.put(
        '/admin/draws/:drawId/positions',
        authenticate,
        requireAdmin,
        validate(schemas.drawIdSchema, 'params'),
        validate(schemas.assignPositionsSchema),
        controller.assignPositions,
    );
    router.post(
        '/admin/draws/:drawId/publish',
        authenticate,
        requireAdmin,
        validate(schemas.drawIdSchema, 'params'),
        controller.publish,
    );
    router.put(
        '/admin/draws/:drawId/matches/:matchId/result',
        authenticate,
        requireAdmin,
        validate(schemas.matchIdSchema, 'params'),
        validate(schemas.recordMatchResultSchema),
        controller.recordMatchResult,
    );
    router.post(
        '/admin/draws/:drawId/finalize-results',
        authenticate,
        requireAdmin,
        validate(schemas.drawIdSchema, 'params'),
        controller.finalizeResults,
    );

    return router;
}

module.exports = createDrawRouter;
