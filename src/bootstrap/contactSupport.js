const PrismaContactSupportRepository = require('../modules/contact-support/infrastructure/PrismaContactSupportRepository');
const ManageContactSupport = require('../modules/contact-support/application/ManageContactSupport');
const createContactSupportController = require('../modules/contact-support/presentation/ContactSupportController');
const createContactSupportRouter = require('../modules/contact-support/presentation/contactSupportRoutes');
const contactSupportSchemas = require('../modules/contact-support/presentation/contactSupportSchemas');
const createRequireAdmin = require('../shared/middleware/requireAdmin');

function createContactSupportModule({ prisma, authenticate }) {
    const controller = createContactSupportController({
        manageContactSupport: new ManageContactSupport({
            contactSupportRepository: new PrismaContactSupportRepository(prisma),
        }),
    });

    return createContactSupportRouter({
        controller,
        schemas: contactSupportSchemas,
        authenticate,
        requireAdmin: createRequireAdmin(prisma),
    });
}

module.exports = createContactSupportModule;
