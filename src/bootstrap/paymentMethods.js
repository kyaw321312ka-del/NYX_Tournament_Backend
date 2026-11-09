const PrismaPaymentMethodRepository = require('../modules/payment-methods/infrastructure/repositories/PrismaPaymentMethodRepository');
const ManagePaymentMethods = require('../modules/payment-methods/application/use-cases/ManagePaymentMethods');
const createPaymentMethodController = require('../modules/payment-methods/presentation/controllers/PaymentMethodController');
const createPaymentMethodRouter = require('../modules/payment-methods/presentation/routes/paymentMethodRoutes');
const paymentMethodSchemas = require('../modules/payment-methods/presentation/validators/paymentMethodSchemas');
const createRequireAdmin = require('../shared/middleware/requireAdmin');

function createPaymentMethodModule({ prisma, authenticate }) {
    const paymentMethodRepository = new PrismaPaymentMethodRepository(prisma);
    const controller = createPaymentMethodController({
        managePaymentMethods: new ManagePaymentMethods({ paymentMethodRepository }),
    });

    return createPaymentMethodRouter({
        controller,
        schemas: paymentMethodSchemas,
        authenticate,
        requireAdmin: createRequireAdmin(prisma),
    });
}

module.exports = createPaymentMethodModule;
