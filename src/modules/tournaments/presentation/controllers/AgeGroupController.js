function createAgeGroupController({ manageAgeGroups }) {
    return {
        async list(req, res, next) {
            try {
                const ageGroups = await manageAgeGroups.list();
                return res.status(200).json({
                    success: true,
                    data: ageGroups,
                });
            } catch (error) {
                return next(error);
            }
        },

        async get(req, res, next) {
            try {
                const ageGroup = await manageAgeGroups.get(req.validatedParams.id);
                return res.status(200).json({ success: true, data: ageGroup });
            } catch (error) {
                return next(error);
            }
        },

        async create(req, res, next) {
            try {
                const ageGroup = await manageAgeGroups.create(req.validatedBody);
                return res.status(201).json({ success: true, data: ageGroup });
            } catch (error) {
                return next(error);
            }
        },

        async update(req, res, next) {
            try {
                const ageGroup = await manageAgeGroups.update(
                    req.validatedParams.id,
                    req.validatedBody,
                );
                return res.status(200).json({ success: true, data: ageGroup });
            } catch (error) {
                return next(error);
            }
        },

        async remove(req, res, next) {
            try {
                await manageAgeGroups.remove(req.validatedParams.id);
                return res.status(204).end();
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createAgeGroupController;
