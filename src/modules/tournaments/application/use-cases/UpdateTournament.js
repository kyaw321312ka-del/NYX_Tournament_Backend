const UpdateTournamentDto = require('../dto/UpdateTournamentDto');

class UpdateTournament {
    constructor({ tournamentRepository, bannerStorage }) {
        this.tournamentRepository = tournamentRepository;
        this.bannerStorage = bannerStorage;
    }

    async execute(id, userId, input, bannerFile) {
        let uploadedBannerUrl;
        try {
            if (bannerFile) {
                uploadedBannerUrl = await this.bannerStorage.save(bannerFile.buffer);
            }

            const result = await this.tournamentRepository.updateOwned(
                id,
                userId,
                UpdateTournamentDto.from({
                    ...input,
                    ...(uploadedBannerUrl ? { bannerUrl: uploadedBannerUrl } : {}),
                }),
            );

            if (result.previousBannerUrl && result.previousBannerUrl !== result.tournament.bannerUrl) {
                try {
                    await this.bannerStorage.remove(result.previousBannerUrl);
                } catch (error) {
                    console.error('Failed to remove the previous tournament banner:', error);
                }
            }

            return result.tournament;
        } catch (error) {
            if (uploadedBannerUrl) {
                try {
                    await this.bannerStorage.remove(uploadedBannerUrl);
                } catch (cleanupError) {
                    console.error('Failed to remove an unreferenced tournament banner:', cleanupError);
                }
            }
            throw error;
        }
    }
}

module.exports = UpdateTournament;
