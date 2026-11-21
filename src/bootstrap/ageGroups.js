const PrismaAgeGroupRepository = require('../modules/tournaments/infrastructure/repositories/PrismaAgeGroupRepository');
const ManageAgeGroups = require('../modules/tournaments/application/use-cases/ManageAgeGroups');
const createAgeGroupController = require('../modules/tournaments/presentation/controllers/AgeGroupController');
const createAgeGroupRouter = require('../modules/tournaments/presentation/routes/ageGroupRoutes');
const ageGroupSchemas = require('../modules/tournaments/presentation/validators/ageGroupSchemas');
const createRequireAdmin = require('../shared/middleware/requireAdmin');

function createAgeGroupModule({ prisma, authenticate }) {
    const controller = createAgeGroupController({
        manageAgeGroups: new ManageAgeGroups({
            ageGroupRepository: new PrismaAgeGroupRepository(prisma),
        }),
    });

    return createAgeGroupRouter({
        controller,
        schemas: ageGroupSchemas,
        authenticate,
        requireAdmin: createRequireAdmin(prisma),
    });
}

module.exports = createAgeGroupModule;
