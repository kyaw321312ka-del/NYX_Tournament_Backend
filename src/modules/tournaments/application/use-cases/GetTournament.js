const TournamentError = require('../../domain/errors/TournamentError');
const PublicationStatus = require('../../domain/enums/PublicationStatus');

class GetTournament {
    constructor({ tournamentRepository }) {
        this.tournamentRepository = tournamentRepository;
    }

    async execute(id, userId = null) {
        const tournament = await this.tournamentRepository.findById(id);
        if (!tournament || (
            tournament.publicationStatus !== PublicationStatus.PUBLISHED &&
            tournament.createdBy !== userId
        )) {
            throw new TournamentError(404, 'Tournament not found.');
        }
        return tournament;
    }
}

module.exports = GetTournament;
