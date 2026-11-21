const express = require('express');
const validate = require('../../../shared/middleware/validateRequest');

function createContactSupportRouter({
    controller,
    schemas,
    authenticate,
    requireAdmin,
}) {
    const router = express.Router();

    router.get('/contact-support', controller.get);
    router.post(
        '/admin/contact-support',
        authenticate,
        requireAdmin,
        validate(schemas.contactSupportSchema),
        controller.create,
    );
    router.put(
        '/admin/contact-support',
        authenticate,
        requireAdmin,
        validate(schemas.contactSupportSchema),
        controller.update,
    );
    router.delete(
        '/admin/contact-support',
        authenticate,
        requireAdmin,
        controller.remove,
    );

    return router;
}

module.exports = createContactSupportRouter;
