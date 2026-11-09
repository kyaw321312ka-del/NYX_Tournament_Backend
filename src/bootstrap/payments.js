const PrismaTournamentPaymentRepository = require('../modules/payments/infrastructure/repositories/PrismaTournamentPaymentRepository');
const LocalPaymentProofStorage = require('../modules/payments/infrastructure/services/LocalPaymentProofStorage');
const TournamentPayments = require('../modules/payments/application/use-cases/TournamentPayments');
const createPaymentController = require('../modules/payments/presentation/controllers/PaymentController');
const createPaymentRouter = require('../modules/payments/presentation/routes/paymentRoutes');
const paymentSchemas = require('../modules/payments/presentation/validators/paymentSchemas');
const createRequireAdmin = require('../shared/middleware/requireAdmin');

function createPaymentModule({ prisma, authenticate }) {
    const tournamentPayments = new TournamentPayments({
        paymentRepository: new PrismaTournamentPaymentRepository(prisma),
        proofStorage: new LocalPaymentProofStorage(),
    });

    return createPaymentRouter({
        controller: createPaymentController({ tournamentPayments }),
        schemas: paymentSchemas,
        authenticate,
        requireAdmin: createRequireAdmin(prisma),
    });
}

module.exports = createPaymentModule;
