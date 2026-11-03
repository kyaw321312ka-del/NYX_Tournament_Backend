const TournamentError = require('../../domain/errors/TournamentError');

class UpdateTournamentBanner {
    constructor({ tournamentRepository, bannerStorage }) {
        this.tournamentRepository = tournamentRepository;
        this.bannerStorage = bannerStorage;
    }

    async execute(id, userId, file) {
        if (!file?.buffer) {
            throw new TournamentError(400, 'Provide a banner file in the "banner" form field.');
        }

        const bannerUrl = await this.bannerStorage.save(file.buffer);
        let result;

        try {
            result = await this.tournamentRepository.updateBannerOwned(id, userId, bannerUrl);
        } catch (error) {
            try {
                await this.bannerStorage.remove(bannerUrl);
            } catch (cleanupError) {
                console.error('Failed to remove an unreferenced tournament banner:', cleanupError);
            }
            throw error;
        }

        if (result.previousBannerUrl) {
            try {
                await this.bannerStorage.remove(result.previousBannerUrl);
            } catch (error) {
                console.error('Failed to remove the previous tournament banner:', error);
            }
        }

        return result.tournament;
    }
}

module.exports = UpdateTournamentBanner;
