function createPaymentMethodController({ managePaymentMethods }) {
    function present(method) {
        return { success: true, data: method.toJSON() };
    }

    return {
        async create(req, res, next) {
            try {
                return res.status(201).json(present(
                    await managePaymentMethods.create(req.validatedBody),
                ));
            } catch (error) {
                return next(error);
            }
        },

        async listAll(req, res, next) {
            try {
                const methods = await managePaymentMethods.listAll();
                return res.status(200).json({
                    success: true,
                    data: methods.map((method) => method.toJSON()),
                });
            } catch (error) {
                return next(error);
            }
        },

        async listActive(req, res, next) {
            try {
                const methods = await managePaymentMethods.listActive();
                return res.status(200).json({
                    success: true,
                    data: methods.map((method) => method.toJSON()),
                });
            } catch (error) {
                return next(error);
            }
        },

        async get(req, res, next) {
            try {
                return res.status(200).json(present(
                    await managePaymentMethods.get(req.validatedParams.id),
                ));
            } catch (error) {
                return next(error);
            }
        },

        async update(req, res, next) {
            try {
                return res.status(200).json(present(
                    await managePaymentMethods.update(req.validatedParams.id, req.validatedBody),
                ));
            } catch (error) {
                return next(error);
            }
        },

        async setStatus(req, res, next) {
            try {
                return res.status(200).json(present(
                    await managePaymentMethods.setStatus(
                        req.validatedParams.id,
                        req.validatedBody.isActive,
                    ),
                ));
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createPaymentMethodController;
