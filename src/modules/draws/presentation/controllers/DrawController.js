function createDrawController({ manageTournamentDraws }) {
    return {
        async listConfigurationOptions(req, res, next) {
            try {
                return res.status(200).json({
                    success: true,
                    data: manageTournamentDraws.listConfigurationOptions(),
                });
            } catch (error) {
                return next(error);
            }
        },
        async getDrawConfiguration(req, res, next) {
            try {
                const configuration = await manageTournamentDraws.getDrawConfiguration(
                    req.validatedParams.categoryId,
                );
                return res.status(200).json({ success: true, data: configuration });
            } catch (error) {
                return next(error);
            }
        },
        async listDrawConfigurations(req, res, next) {
            try {
                const configurations = await manageTournamentDraws.listDrawConfigurations();
                return res.status(200).json({ success: true, data: configurations });
            } catch (error) {
                return next(error);
            }
        },
        async listEligibleRegistrations(req, res, next) {
            try {
                const registrations = await manageTournamentDraws.listEligibleRegistrations(
                    req.validatedParams.categoryId,
                );
                return res.status(200).json({ success: true, data: registrations });
            } catch (error) {
                return next(error);
            }
        },

        async createDraft(req, res, next) {
            try {
                const draw = await manageTournamentDraws.createDraft(
                    req.validatedParams.categoryId,
                    req.validatedBody,
                );
                return res.status(201).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async getLatestDraw(req, res, next) {
            try {
                const draw = await manageTournamentDraws.getLatestDraw(
                    req.validatedParams.categoryId,
                );
                return res.status(200).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async getDraw(req, res, next) {
            try {
                const draw = await manageTournamentDraws.getDraw(
                    req.validatedParams.categoryId,
                    req.validatedParams.drawId,
                );
                return res.status(200).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async getPublishedDraw(req, res, next) {
            try {
                const draw = await manageTournamentDraws.getPublishedDraw(
                    req.validatedParams.categoryId,
                );
                return res.status(200).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async assignPositions(req, res, next) {
            try {
                const draw = await manageTournamentDraws.assignPositions(
                    req.validatedParams.drawId,
                    req.validatedBody.assignments,
                );
                return res.status(200).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async publish(req, res, next) {
            try {
                const draw = await manageTournamentDraws.publish(req.validatedParams.drawId);
                return res.status(200).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async recordMatchResult(req, res, next) {
            try {
                const draw = await manageTournamentDraws.recordMatchResult(
                    req.validatedParams.drawId,
                    req.validatedParams.matchId,
                    req.validatedBody.games,
                );
                return res.status(200).json({ success: true, data: draw.toJSON() });
            } catch (error) {
                return next(error);
            }
        },

        async finalizeResults(req, res, next) {
            try {
                const result = await manageTournamentDraws.finalizeResults(
                    req.validatedParams.drawId,
                );
                return res.status(200).json({
                    success: true,
                    data: {
                        draw: result.draw.toJSON(),
                        rankingPointAwards: result.rankingPointAwards,
                    },
                });
            } catch (error) {
                return next(error);
            }
        },

        async listRankingPointAwards(req, res, next) {
            try {
                const awards = await manageTournamentDraws.listRankingPointAwards(
                    req.validatedParams.categoryId,
                );
                return res.status(200).json({ success: true, data: awards });
            } catch (error) {
                return next(error);
            }
        },

        async getCategoryLeaderboard(req, res, next) {
            try {
                const leaderboard = await manageTournamentDraws.getCategoryLeaderboard(
                    req.validatedParams.categoryId,
                );
                return res.status(200).json({ success: true, data: leaderboard });
            } catch (error) {
                return next(error);
            }
        },
    };
}

module.exports = createDrawController;
