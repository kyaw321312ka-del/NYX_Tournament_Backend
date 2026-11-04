const CreateTournamentDto = require('../dto/CreateTournamentDto');

class CreateTournament {
    constructor({ tournamentRepository, bannerStorage }) {
        this.tournamentRepository = tournamentRepository;
        this.bannerStorage = bannerStorage;
    }

    async execute(userId, input, bannerFile) {
        let bannerUrl;
        try {
            if (bannerFile) {
                bannerUrl = await this.bannerStorage.save(bannerFile.buffer);
            }

            return await this.tournamentRepository.create(
                userId,
                CreateTournamentDto.from({
                    ...input,
                    ...(bannerUrl ? { bannerUrl } : {}),
                }),
            );
        } catch (error) {
            if (bannerUrl) {
                try {
                    await this.bannerStorage.remove(bannerUrl);
                } catch (cleanupError) {
                    console.error('Failed to remove an unreferenced tournament banner:', cleanupError);
                }
            }
            throw error;
        }
    }
}

module.exports = CreateTournament;
