const express = require('express');
const validate = require('../../../../shared/middleware/validateRequest');

function createPaymentMethodRouter({
    controller,
    schemas,
    authenticate,
    requireAdmin,
}) {
    const router = express.Router();

    router.get('/payment-methods', authenticate, controller.listActive);
    router.post(
        '/admin/payment-methods',
        authenticate,
        requireAdmin,
        validate(schemas.createPaymentMethodSchema),
        controller.create,
    );
    router.get('/admin/payment-methods', authenticate, requireAdmin, controller.listAll);
    router.get(
        '/admin/payment-methods/:id',
        authenticate,
        requireAdmin,
        validate(schemas.paymentMethodIdSchema, 'params'),
        controller.get,
    );
    router.patch(
        '/admin/payment-methods/:id',
        authenticate,
        requireAdmin,
        validate(schemas.paymentMethodIdSchema, 'params'),
        validate(schemas.updatePaymentMethodSchema),
        controller.update,
    );
    router.patch(
        '/admin/payment-methods/:id/status',
        authenticate,
        requireAdmin,
        validate(schemas.paymentMethodIdSchema, 'params'),
        validate(schemas.setPaymentMethodStatusSchema),
        controller.setStatus,
    );

    return router;
}

module.exports = createPaymentMethodRouter;
