const RegisterUser = require('../modules/auth/application/use-cases/RegisterUser');
const VerifyEmailOtp = require('../modules/auth/application/use-cases/VerifyEmailOtp');
const LoginUser = require('../modules/auth/application/use-cases/LoginUser');
const OtpService = require('../modules/auth/domain/services/OtpService');
const PrismaAuthRepository = require('../modules/auth/infrastructure/repositories/PrismaAuthRepository');
const EmailOtpSender = require('../modules/auth/infrastructure/services/EmailOtpSender');
const PasswordHasher = require('../modules/auth/infrastructure/services/PasswordHasher');
const TokenService = require('../modules/auth/infrastructure/services/TokenService');
const createAuthController = require('../modules/auth/presentation/controllers/AuthController');
const createAuthenticate = require('../modules/auth/presentation/middleware/authenticate');
const createAuthRouter = require('../modules/auth/presentation/routes/authRoutes');
const authSchemas = require('../modules/auth/presentation/validators/authSchemas');

function createAuthModule({ prisma }) {
    const authRepository = new PrismaAuthRepository(prisma);
    const passwordHasher = new PasswordHasher();
    const otpService = new OtpService();
    const tokenService = new TokenService();
    const controller = createAuthController({
        registerUser: new RegisterUser({
            authRepository,
            passwordHasher,
            otpService,
            emailOtpSender: new EmailOtpSender(),
        }),
        verifyEmailOtp: new VerifyEmailOtp({ authRepository, otpService, tokenService }),
        loginUser: new LoginUser({ authRepository, passwordHasher, tokenService }),
        authRepository,
    });

    return {
        routes: createAuthRouter({
            controller,
            schemas: authSchemas,
            authenticate: createAuthenticate(tokenService),
        }),
        authenticate: createAuthenticate(tokenService),
    };
}

module.exports = createAuthModule;
