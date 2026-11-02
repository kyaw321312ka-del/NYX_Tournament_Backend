const PrismaRegistrationRepository = require('../modules/registrations/infrastructure/repositories/PrismaRegistrationRepository');
const CreateRegistration = require('../modules/registrations/application/use-cases/CreateRegistration');
const ListMyRegistrations = require('../modules/registrations/application/use-cases/ListMyRegistrations');
const ListRegistrationStatuses = require('../modules/registrations/application/use-cases/ListRegistrationStatuses');
const CreatePartnerInvitation = require('../modules/registrations/application/use-cases/CreatePartnerInvitation');
const ListReceivedInvitations = require('../modules/registrations/application/use-cases/ListReceivedInvitations');
const ListSentInvitations = require('../modules/registrations/application/use-cases/ListSentInvitations');
const AcceptPartnerInvitation = require('../modules/registrations/application/use-cases/AcceptPartnerInvitation');
const DeclinePartnerInvitation = require('../modules/registrations/application/use-cases/DeclinePartnerInvitation');
const CancelPartnerInvitation = require('../modules/registrations/application/use-cases/CancelPartnerInvitation');
const createRegistrationController = require('../modules/registrations/presentation/controllers/RegistrationController');
const createRegistrationRouter = require('../modules/registrations/presentation/routes/registrationRoutes');
const registrationSchemas = require('../modules/registrations/presentation/validators/registrationSchemas');

function createRegistrationModule({ prisma, authenticate }) {
    const registrationRepository = new PrismaRegistrationRepository(prisma);
    const controller = createRegistrationController({
        createRegistration: new CreateRegistration({ registrationRepository }),
        listMyRegistrations: new ListMyRegistrations({ registrationRepository }),
        listRegistrationStatuses: new ListRegistrationStatuses({ registrationRepository }),
        createPartnerInvitation: new CreatePartnerInvitation({ registrationRepository }),
        listReceivedInvitations: new ListReceivedInvitations({ registrationRepository }),
        listSentInvitations: new ListSentInvitations({ registrationRepository }),
        acceptPartnerInvitation: new AcceptPartnerInvitation({ registrationRepository }),
        declinePartnerInvitation: new DeclinePartnerInvitation({ registrationRepository }),
        cancelPartnerInvitation: new CancelPartnerInvitation({ registrationRepository }),
    });

    return createRegistrationRouter({
        controller,
        schemas: registrationSchemas,
        authenticate,
    });
}

module.exports = createRegistrationModule;
