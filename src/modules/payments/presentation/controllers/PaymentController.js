function createPaymentController({ tournamentPayments }) {
    return {
        async submit(req, res, next) {
            try {
                const payment = await tournamentPayments.submit(
                    req.auth.userId,
                    req.validatedParams.registrationId,
                    req.validatedBody,
                    req.file,
                );
                return res.status(201).json({ success: true, data: payment.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async listMine(req, res, next) {
            try {
                const result = await tournamentPayments.listMine(req.auth.userId, req.validatedQuery);
                return res.status(200).json({
                    success: true,
                    data: result.items.map((item) => item.toJSON()),
                    pagination: result.pagination,
                });
            } catch (error) {
                return next(error);
            }
        },

        async listPending(req, res, next) {
            try {
                const result = await tournamentPayments.listPending(req.validatedQuery);
                return res.status(200).json({
                    success: true,
                    data: result.items.map((item) => item.toJSON()),
                    pagination: result.pagination,
                });
            } catch (error) {
                return next(error);
            }
        },

        async verify(req, res, next) {
            try {
                const payment = await tournamentPayments.review(
                    req.auth.userId,
                    req.validatedParams.id,
                    'approve',
                );
                return res.status(200).json({ success: true, data: payment.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async reject(req, res, next) {
            try {
                const payment = await tournamentPayments.review(
                    req.auth.userId,
                    req.validatedParams.id,
                    'reject',
                    req.validatedBody.rejectionReason,
                );
                return res.status(200).json({ success: true, data: payment.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async getProof(req, res, next) {
            try {
                const proof = await tournamentPayments.readProof(req.validatedParams.id);
                res.set('Content-Type', proof.contentType);
                res.set('Cache-Control', 'private, no-store');
                return res.status(200).send(proof.buffer);
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createPaymentController;
