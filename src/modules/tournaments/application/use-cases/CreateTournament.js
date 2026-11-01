const CreateTournamentDto = require('../dto/CreateTournamentDto');

class CreateTournament {
    constructor({ tournamentRepository }) {
        this.tournamentRepository = tournamentRepository;
    }

    execute(userId, input) {
        return this.tournamentRepository.create(userId, CreateTournamentDto.from(input));
    }
}

module.exports = CreateTournament;
