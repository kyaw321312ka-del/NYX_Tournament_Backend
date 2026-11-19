const express = require('express');
const validate = require('../../../../shared/middleware/validateRequest');

function createRegistrationRouter({ controller, schemas, authenticate, requirePlayer }) {
    const router = express.Router();

    router.get('/statuses', controller.listStatuses);
    router.get('/mine', authenticate, requirePlayer, validate(schemas.listMyRegistrationsSchema, 'query'), controller.listMine);
    router.post(
        '/partner-invitations',
        authenticate,
        requirePlayer,
        validate(schemas.createPartnerInvitationSchema),
        controller.createPartnerInvitation,
    );
    router.get(
        '/partner-invitations/received',
        authenticate,
        requirePlayer,
        validate(schemas.listMyRegistrationsSchema, 'query'),
        controller.listReceivedInvitations,
    );
    router.get(
        '/partner-invitations/sent',
        authenticate,
        requirePlayer,
        validate(schemas.listMyRegistrationsSchema, 'query'),
        controller.listSentInvitations,
    );
    router.post(
        '/partner-invitations/:id/accept',
        authenticate,
        requirePlayer,
        validate(schemas.invitationIdSchema, 'params'),
        controller.acceptPartnerInvitation,
    );
    router.post(
        '/partner-invitations/:id/decline',
        authenticate,
        requirePlayer,
        validate(schemas.invitationIdSchema, 'params'),
        controller.declinePartnerInvitation,
    );
    router.post(
        '/partner-invitations/:id/cancel',
        authenticate,
        requirePlayer,
        validate(schemas.invitationIdSchema, 'params'),
        controller.cancelPartnerInvitation,
    );
    router.post('/', authenticate, requirePlayer, validate(schemas.createRegistrationSchema), controller.create);

    return router;
}

module.exports = createRegistrationRouter;
