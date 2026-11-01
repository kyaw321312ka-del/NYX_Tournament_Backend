class ListTournaments {
    constructor({ tournamentRepository }) {
        this.tournamentRepository = tournamentRepository;
    }

    execute({ page = 1, pageSize = 20, userId = null } = {}) {
        return this.tournamentRepository.list({ page, pageSize, userId });
    }
}

module.exports = ListTournaments;
