const PrismaUserRepository = require('../modules/users/infrastructure/repositories/PrismaUserRepository');
const LocalPlayerProfileImageStorage = require('../modules/users/infrastructure/services/LocalPlayerProfileImageStorage');
const LocalIdentityDocumentStorage = require('../modules/users/infrastructure/services/LocalIdentityDocumentStorage');
const UpdatePlayerProfileImage = require('../modules/users/application/use-cases/UpdatePlayerProfileImage');
const UpdateIdentityDocuments = require('../modules/users/application/use-cases/UpdateIdentityDocuments');
const createUserRouter = require('../modules/users/presentation/routes/userRoutes');

function createUserModule({ prisma, authenticate }) {
    const updatePlayerProfileImage = new UpdatePlayerProfileImage({
        userRepository: new PrismaUserRepository(prisma),
        imageStorage: new LocalPlayerProfileImageStorage(),
    });
    const updateIdentityDocuments = new UpdateIdentityDocuments({
        userRepository: new PrismaUserRepository(prisma),
        documentStorage: new LocalIdentityDocumentStorage(),
    });

    return createUserRouter({
        authenticate,
        updatePlayerProfileImage,
        updateIdentityDocuments,
    });
}

module.exports = createUserModule;
