function createContactSupportController({ manageContactSupport }) {
    return {
        async get(req, res, next) {
            try {
                const contactSupport = await manageContactSupport.get();
                return res.status(200).json({ success: true, data: contactSupport });
            } catch (error) {
                return next(error);
            }
        },

        async create(req, res, next) {
            try {
                const contactSupport = await manageContactSupport.create(req.validatedBody);
                return res.status(201).json({ success: true, data: contactSupport });
            } catch (error) {
                return next(error);
            }
        },

        async update(req, res, next) {
            try {
                const contactSupport = await manageContactSupport.update(req.validatedBody);
                return res.status(200).json({ success: true, data: contactSupport });
            } catch (error) {
                return next(error);
            }
        },

        async remove(req, res, next) {
            try {
                await manageContactSupport.remove();
                return res.status(204).end();
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createContactSupportController;
