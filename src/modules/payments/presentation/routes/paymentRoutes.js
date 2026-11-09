const express = require('express');
const validate = require('../../../../shared/middleware/validateRequest');
const parsePaymentProof = require('../middleware/parsePaymentProof');

function createPaymentRouter({ controller, schemas, authenticate, requireAdmin }) {
    const router = express.Router();

    router.post(
        '/registrations/:registrationId/payments',
        authenticate,
        validate(schemas.registrationIdSchema, 'params'),
        parsePaymentProof,
        validate(schemas.submitPaymentSchema),
        controller.submit,
    );
    router.get(
        '/payments/my',
        authenticate,
        validate(schemas.listPaymentHistorySchema, 'query'),
        controller.listMine,
    );
    router.get(
        '/admin/payments/pending',
        authenticate,
        requireAdmin,
        validate(schemas.listPaymentHistorySchema, 'query'),
        controller.listPending,
    );
    router.get(
        '/admin/payments/:id/proof',
        authenticate,
        requireAdmin,
        validate(schemas.paymentIdSchema, 'params'),
        controller.getProof,
    );
    router.patch(
        '/admin/payments/:id/verify',
        authenticate,
        requireAdmin,
        validate(schemas.paymentIdSchema, 'params'),
        controller.verify,
    );
    router.patch(
        '/admin/payments/:id/reject',
        authenticate,
        requireAdmin,
        validate(schemas.paymentIdSchema, 'params'),
        validate(schemas.rejectPaymentSchema),
        controller.reject,
    );

    return router;
}

module.exports = createPaymentRouter;
