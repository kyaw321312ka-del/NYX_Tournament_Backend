class PublishTournament {
    constructor({ tournamentRepository }) {
        this.tournamentRepository = tournamentRepository;
    }

    execute(id, userId) {
        return this.tournamentRepository.publishOwned(id, userId);
    }
}

module.exports = PublishTournament;
