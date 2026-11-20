const PrismaUserRepository = require('../modules/users/infrastructure/repositories/PrismaUserRepository');
const LocalPlayerProfileImageStorage = require('../modules/users/infrastructure/services/LocalPlayerProfileImageStorage');
const LocalIdentityDocumentStorage = require('../modules/users/infrastructure/services/LocalIdentityDocumentStorage');
const UpdatePlayerProfileImage = require('../modules/users/application/use-cases/UpdatePlayerProfileImage');
const UpdateIdentityDocuments = require('../modules/users/application/use-cases/UpdateIdentityDocuments');
const UpdateUserProfile = require('../modules/users/application/use-cases/UpdateUserProfile');
const VerifyEmailChange = require('../modules/users/application/use-cases/VerifyEmailChange');
const ReviewIdentityDocuments = require('../modules/users/application/use-cases/ReviewIdentityDocuments');
const ListAdminPlayers = require('../modules/users/application/use-cases/ListAdminPlayers');
const GetAdminPlayerDetails = require('../modules/users/application/use-cases/GetAdminPlayerDetails');
const OtpService = require('../modules/auth/domain/services/OtpService');
const EmailOtpSender = require('../modules/auth/infrastructure/services/EmailOtpSender');
const PasswordHasher = require('../modules/auth/infrastructure/services/PasswordHasher');
const createUserRouter = require('../modules/users/presentation/routes/userRoutes');
const createAdminUserRouter = require('../modules/users/presentation/routes/adminUserRoutes');
const createRequireAdmin = require('../shared/middleware/requireAdmin');

function createUserModule({ prisma, authenticate }) {
    const userRepository = new PrismaUserRepository(prisma);
    const profileImageStorage = new LocalPlayerProfileImageStorage();
    const identityDocumentStorage = new LocalIdentityDocumentStorage();
    const updatePlayerProfileImage = new UpdatePlayerProfileImage({
        userRepository,
        imageStorage: profileImageStorage,
    });
    const updateIdentityDocuments = new UpdateIdentityDocuments({
        userRepository,
        documentStorage: identityDocumentStorage,
    });
    const updateUserProfile = new UpdateUserProfile({
        userRepository,
        passwordHasher: new PasswordHasher(),
        otpService: new OtpService(),
        emailOtpSender: new EmailOtpSender(),
        profileImageStorage,
        identityDocumentStorage,
    });
    const verifyEmailChange = new VerifyEmailChange({
        userRepository,
        otpService: new OtpService(),
    });
    const reviewIdentityDocuments = new ReviewIdentityDocuments({ userRepository });
    const listAdminPlayers = new ListAdminPlayers({ userRepository });
    const getAdminPlayerDetails = new GetAdminPlayerDetails({ userRepository });

    const requireAdmin = createRequireAdmin(prisma);
    return {
        userRoutes: createUserRouter({
            authenticate,
            updatePlayerProfileImage,
            updateIdentityDocuments,
            updateUserProfile,
            verifyEmailChange,
            reviewIdentityDocuments,
            requireAdmin,
        }),
        adminUserRoutes: createAdminUserRouter({
            authenticate,
            requireAdmin,
            listAdminPlayers,
            getAdminPlayerDetails,
        }),
    };
}

module.exports = createUserModule;
