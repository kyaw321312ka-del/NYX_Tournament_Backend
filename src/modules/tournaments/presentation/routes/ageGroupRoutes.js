const express = require('express');
const validate = require('../../../../shared/middleware/validateRequest');

function createAgeGroupRouter({
    controller,
    schemas,
    authenticate,
    requireAdmin,
}) {
    const router = express.Router();

    router.get('/age-groups', controller.list);
    router.get(
        '/age-groups/:id',
        validate(schemas.ageGroupIdSchema, 'params'),
        controller.get,
    );
    router.post(
        '/age-groups',
        authenticate,
        requireAdmin,
        validate(schemas.createAgeGroupSchema),
        controller.create,
    );
    router.put(
        '/age-groups/:id',
        authenticate,
        requireAdmin,
        validate(schemas.ageGroupIdSchema, 'params'),
        validate(schemas.updateAgeGroupSchema),
        controller.update,
    );
    router.delete(
        '/age-groups/:id',
        authenticate,
        requireAdmin,
        validate(schemas.ageGroupIdSchema, 'params'),
        controller.remove,
    );

    return router;
}

module.exports = createAgeGroupRouter;
