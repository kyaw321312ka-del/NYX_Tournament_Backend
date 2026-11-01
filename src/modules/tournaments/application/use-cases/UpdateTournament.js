const UpdateTournamentDto = require('../dto/UpdateTournamentDto');

class UpdateTournament {
    constructor({ tournamentRepository }) {
        this.tournamentRepository = tournamentRepository;
    }

    execute(id, userId, input) {
        return this.tournamentRepository.updateOwned(id, userId, UpdateTournamentDto.from(input));
    }
}

module.exports = UpdateTournament;
