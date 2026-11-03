const PrismaUserRepository = require('../modules/users/infrastructure/repositories/PrismaUserRepository');
const LocalPlayerProfileImageStorage = require('../modules/users/infrastructure/services/LocalPlayerProfileImageStorage');
const UpdatePlayerProfileImage = require('../modules/users/application/use-cases/UpdatePlayerProfileImage');
const createUserRouter = require('../modules/users/presentation/routes/userRoutes');

function createUserModule({ prisma, authenticate }) {
    const updatePlayerProfileImage = new UpdatePlayerProfileImage({
        userRepository: new PrismaUserRepository(prisma),
        imageStorage: new LocalPlayerProfileImageStorage(),
    });

    return createUserRouter({
        authenticate,
        updatePlayerProfileImage,
    });
}

module.exports = createUserModule;
