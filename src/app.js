require('dotenv').config();

const express = require('express');
const prisma = require('./shared/database/prisma');
const RegisterUser = require('./modules/auth/application/use-cases/RegisterUser');
const VerifyEmailOtp = require('./modules/auth/application/use-cases/VerifyEmailOtp');
const LoginUser = require('./modules/auth/application/use-cases/LoginUser');
const OtpService = require('./modules/auth/domain/services/OtpService');
const PrismaAuthRepository = require('./modules/auth/infrastructure/repositories/PrismaAuthRepository');
const EmailOtpSender = require('./modules/auth/infrastructure/services/EmailOtpSender');
const PasswordHasher = require('./modules/auth/infrastructure/services/PasswordHasher');
const TokenService = require('./modules/auth/infrastructure/services/TokenService');
const createAuthController = require('./modules/auth/presentation/controllers/AuthController');
const createAuthenticate = require('./modules/auth/presentation/middleware/authenticate');
const createAuthRouter = require('./modules/auth/presentation/routes/authRoutes');
const authSchemas = require('./modules/auth/presentation/validators/authSchemas');
const PrismaTournamentRepository = require('./modules/tournaments/infrastructure/repositories/PrismaTournamentRepository');
const CreateTournament = require('./modules/tournaments/application/use-cases/CreateTournament');
const GetTournament = require('./modules/tournaments/application/use-cases/GetTournament');
const ListTournaments = require('./modules/tournaments/application/use-cases/ListTournaments');
const UpdateTournament = require('./modules/tournaments/application/use-cases/UpdateTournament');
const PublishTournament = require('./modules/tournaments/application/use-cases/PublishTournament');
const DeleteTournament = require('./modules/tournaments/application/use-cases/DeleteTournament');
const createTournamentController = require('./modules/tournaments/presentation/controllers/TournamentController');
const createTournamentRouter = require('./modules/tournaments/presentation/routes/tournamentRoutes');
const tournamentSchemas = require('./modules/tournaments/presentation/validators/tournamentSchemas');
const userRoutes = require('./modules/users/presentation/routes/userRoutes');
const errorHandler = require('./shared/middleware/errorHandler');
const notFound = require('./shared/middleware/notFound');

const app = express();
const authRepository = new PrismaAuthRepository(prisma);
const passwordHasher = new PasswordHasher();
const otpService = new OtpService();
const authTokenService = new TokenService();
const authController = createAuthController({
    registerUser: new RegisterUser({
        authRepository,
        passwordHasher,
        otpService,
        emailOtpSender: new EmailOtpSender(),
    }),
    verifyEmailOtp: new VerifyEmailOtp({
        authRepository,
        otpService,
        tokenService: authTokenService,
    }),
    loginUser: new LoginUser({
        authRepository,
        passwordHasher,
        tokenService: authTokenService,
    }),
    authRepository,
});
const authRoutes = createAuthRouter({
    controller: authController,
    schemas: authSchemas,
    authenticate: createAuthenticate(authTokenService),
});
const tournamentRepository = new PrismaTournamentRepository(prisma);
const tournamentController = createTournamentController({
    createTournament: new CreateTournament({ tournamentRepository }),
    getTournament: new GetTournament({ tournamentRepository }),
    listTournaments: new ListTournaments({ tournamentRepository }),
    updateTournament: new UpdateTournament({ tournamentRepository }),
    publishTournament: new PublishTournament({ tournamentRepository }),
    deleteTournament: new DeleteTournament({ tournamentRepository }),
});
const tokenService = new TokenService();
const authenticate = createAuthenticate(tokenService);
const tournamentRoutes = createTournamentRouter({
    controller: tournamentController,
    schemas: tournamentSchemas,
    authenticate,
    optionalAuthenticate(req, res, next) {
        if (!req.get('authorization')) return next();
        return authenticate(req, res, next);
    },
});

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Node.js API is running!' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
