const SingleEliminationGenerator = require('../modules/draws/domain/services/SingleEliminationGenerator');
const ManageTournamentDraws = require('../modules/draws/application/use-cases/ManageTournamentDraws');
const PrismaTournamentDrawRepository = require('../modules/draws/infrastructure/repositories/PrismaTournamentDrawRepository');
const createDrawController = require('../modules/draws/presentation/controllers/DrawController');
const createDrawRouter = require('../modules/draws/presentation/routes/drawRoutes');
const drawSchemas = require('../modules/draws/presentation/validators/drawSchemas');
const createRequireAdmin = require('../shared/middleware/requireAdmin');

function createDrawModule({ prisma, authenticate }) {
    const drawRepository = new PrismaTournamentDrawRepository(
        prisma,
        new SingleEliminationGenerator(),
    );

    return createDrawRouter({
        controller: createDrawController({
            manageTournamentDraws: new ManageTournamentDraws({ drawRepository }),
        }),
        schemas: drawSchemas,
        authenticate,
        requireAdmin: createRequireAdmin(prisma),
    });
}

module.exports = createDrawModule;
