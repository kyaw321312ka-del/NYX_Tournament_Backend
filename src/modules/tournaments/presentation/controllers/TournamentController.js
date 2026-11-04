function createTournamentController({
    createTournament,
    getTournament,
    listTournaments,
    updateTournament,
    publishTournament,
    deleteTournament,
}) {
    return {
        async create(req, res, next) {
            try {
                const tournament = await createTournament.execute(
                    req.auth.userId,
                    req.validatedBody,
                    req.file,
                );
                return res.status(201).json({ success: true, data: tournament.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async get(req, res, next) {
            try {
                const tournament = await getTournament.execute(req.validatedParams.id, req.auth?.userId);
                return res.status(200).json({ success: true, data: tournament.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async list(req, res, next) {
            try {
                const result = await listTournaments.execute({
                    ...req.validatedQuery,
                    userId: req.auth?.userId ?? null,
                });
                return res.status(200).json({
                    success: true,
                    data: result.items.map((item) => item.toJSON()),
                    pagination: result.pagination,
                });
            } catch (error) {
                return next(error);
            }
        },

        async update(req, res, next) {
            try {
                const tournament = await updateTournament.execute(
                    req.validatedParams.id,
                    req.auth.userId,
                    req.validatedBody,
                    req.file,
                );
                return res.status(200).json({ success: true, data: tournament.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async publish(req, res, next) {
            try {
                const tournament = await publishTournament.execute(req.validatedParams.id, req.auth.userId);
                return res.status(200).json({ success: true, data: tournament.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async remove(req, res, next) {
            try {
                await deleteTournament.execute(req.validatedParams.id, req.auth.userId);
                return res.status(204).end();
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createTournamentController;
