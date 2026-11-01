class DeleteTournament {
    constructor({ tournamentRepository }) {
        this.tournamentRepository = tournamentRepository;
    }

    execute(id, userId) {
        return this.tournamentRepository.deleteOwned(id, userId);
    }
}

module.exports = DeleteTournament;
