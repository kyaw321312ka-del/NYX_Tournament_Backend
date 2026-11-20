const express = require('express');
const validate = require('../../../../shared/middleware/validateRequest');

function createDrawRouter({ controller, schemas, authenticate, requireAdmin }) {
    const router = express.Router();

    router.get(
        '/tournament-categories/:categoryId/draw',
        validate(schemas.categoryIdSchema, 'params'),
        controller.getPublishedDraw,
    );
    router.get(
        '/admin/tournament-categories/:categoryId/eligible-registrations',
        authenticate,
        requireAdmin,
        validate(schemas.categoryIdSchema, 'params'),
        controller.listEligibleRegistrations,
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

    return router;
}

module.exports = createDrawRouter;
