const PrismaTournamentRepository = require('../modules/tournaments/infrastructure/repositories/PrismaTournamentRepository');
const CreateTournament = require('../modules/tournaments/application/use-cases/CreateTournament');
const GetTournament = require('../modules/tournaments/application/use-cases/GetTournament');
const ListTournaments = require('../modules/tournaments/application/use-cases/ListTournaments');
const UpdateTournament = require('../modules/tournaments/application/use-cases/UpdateTournament');
const PublishTournament = require('../modules/tournaments/application/use-cases/PublishTournament');
const DeleteTournament = require('../modules/tournaments/application/use-cases/DeleteTournament');
const LocalTournamentBannerStorage = require('../modules/tournaments/infrastructure/services/LocalTournamentBannerStorage');
const createTournamentController = require('../modules/tournaments/presentation/controllers/TournamentController');
const createTournamentRouter = require('../modules/tournaments/presentation/routes/tournamentRoutes');
const tournamentSchemas = require('../modules/tournaments/presentation/validators/tournamentSchemas');

function createTournamentModule({ prisma, authenticate }) {
    const tournamentRepository = new PrismaTournamentRepository(prisma);
    const bannerStorage = new LocalTournamentBannerStorage();
    const controller = createTournamentController({
        createTournament: new CreateTournament({ tournamentRepository, bannerStorage }),
        getTournament: new GetTournament({ tournamentRepository }),
        listTournaments: new ListTournaments({ tournamentRepository }),
        updateTournament: new UpdateTournament({ tournamentRepository, bannerStorage }),
        publishTournament: new PublishTournament({ tournamentRepository }),
        deleteTournament: new DeleteTournament({ tournamentRepository }),
    });

    return createTournamentRouter({
        controller,
        schemas: tournamentSchemas,
        authenticate,
        optionalAuthenticate(req, res, next) {
            if (!req.get('authorization')) return next();
            return authenticate(req, res, next);
        },
    });
}

module.exports = createTournamentModule;
