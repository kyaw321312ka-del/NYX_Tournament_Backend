function createRegistrationController({
    createRegistration,
    listMyRegistrations,
    listRegistrationStatuses,
    createPartnerInvitation,
    listReceivedInvitations,
    listSentInvitations,
    acceptPartnerInvitation,
    declinePartnerInvitation,
    cancelPartnerInvitation,
}) {
    return {
        async create(req, res, next) {
            try {
                const registration = await createRegistration.execute(req.auth.userId, req.validatedBody);
                return res.status(201).json({
                    success: true,
                    data: registration.toJSON(),
                });
            } catch (error) {
                return next(error);
            }
        },

        async listMine(req, res, next) {
            try {
                const result = await listMyRegistrations.execute(req.auth.userId, req.validatedQuery);
                return res.status(200).json({
                    success: true,
                    data: result.items.map((item) => item.toJSON()),
                    pagination: result.pagination,
                });
            } catch (error) {
                return next(error);
            }
        },

        async listStatuses(req, res, next) {
            try {
                const statuses = await listRegistrationStatuses.execute();
                return res.status(200).json({
                    success: true,
                    data: statuses,
                });
            } catch (error) {
                return next(error);
            }
        },

        async createPartnerInvitation(req, res, next) {
            try {
                const invitation = await createPartnerInvitation.execute(req.auth.userId, req.validatedBody);
                return res.status(201).json({
                    success: true,
                    data: invitation.toJSON(),
                });
            } catch (error) {
                return next(error);
            }
        },

        async listReceivedInvitations(req, res, next) {
            try {
                const result = await listReceivedInvitations.execute(req.auth.userId, req.validatedQuery);
                return res.status(200).json({
                    success: true,
                    data: result.items.map((item) => item.toJSON()),
                    pagination: result.pagination,
                });
            } catch (error) {
                return next(error);
            }
        },

        async listSentInvitations(req, res, next) {
            try {
                const result = await listSentInvitations.execute(req.auth.userId, req.validatedQuery);
                return res.status(200).json({
                    success: true,
                    data: result.items.map((item) => item.toJSON()),
                    pagination: result.pagination,
                });
            } catch (error) {
                return next(error);
            }
        },

        async acceptPartnerInvitation(req, res, next) {
            try {
                const registration = await acceptPartnerInvitation.execute(
                    req.auth.userId,
                    req.validatedParams.id,
                );
                return res.status(201).json({
                    success: true,
                    data: registration.toJSON(),
                });
            } catch (error) {
                return next(error);
            }
        },

        async declinePartnerInvitation(req, res, next) {
            try {
                const invitation = await declinePartnerInvitation.execute(
                    req.auth.userId,
                    req.validatedParams.id,
                );
                return res.status(200).json({
                    success: true,
                    data: invitation.toJSON(),
                });
            } catch (error) {
                return next(error);
            }
        },

        async cancelPartnerInvitation(req, res, next) {
            try {
                const invitation = await cancelPartnerInvitation.execute(
                    req.auth.userId,
                    req.validatedParams.id,
                );
                return res.status(200).json({
                    success: true,
                    data: invitation.toJSON(),
                });
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createRegistrationController;
