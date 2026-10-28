const prisma = require('../../config/prisma');
const RegisterUser = require('./application/use-cases/RegisterUser');
const VerifyEmailOtp = require('./application/use-cases/VerifyEmailOtp');
const LoginUser = require('./application/use-cases/LoginUser');
const OtpService = require('./domain/services/OtpService');
const PrismaAuthRepository = require('./infrastructure/repositories/PrismaAuthRepository');
const EmailOtpSender = require('./infrastructure/services/EmailOtpSender');
const PasswordHasher = require('./infrastructure/services/PasswordHasher');
const TokenService = require('./infrastructure/services/TokenService');
const createAuthenticate = require('./presentation/middleware/authenticate');
const createAuthRouter = require('./presentation/routes/authRoutes');
const schemas = require('./presentation/validators/authSchemas');
const createAuthController = require('./presentation/controllers/AuthController');

const authRepository = new PrismaAuthRepository(prisma);
const passwordHasher = new PasswordHasher();
const otpService = new OtpService();
const tokenService = new TokenService();
const registerUser = new RegisterUser({
  authRepository,
  passwordHasher,
  otpService,
  emailOtpSender: new EmailOtpSender(),
});
const verifyEmailOtp = new VerifyEmailOtp({ authRepository, otpService, tokenService });
const loginUser = new LoginUser({ authRepository, passwordHasher, tokenService });
const controller = createAuthController({
  registerUser,
  verifyEmailOtp,
  loginUser,
  authRepository,
});

module.exports = createAuthRouter({
  controller,
  schemas,
  authenticate: createAuthenticate(tokenService),
});
