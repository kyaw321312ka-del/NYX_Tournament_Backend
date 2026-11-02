require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const REGISTRATION_STATUSES = [
    'pending',
    'confirmed',
    'rejected',
    'cancelled',
    'waitlisted',
];

async function seedRegistrationStatuses(database) {
    const statuses = [];

    for (const name of REGISTRATION_STATUSES) {
        const status = await database.tournamentRegistrationStatus.upsert({
            where: { name },
            create: { name },
            update: {},
        });
        statuses.push(status);
    }

    return statuses;
}

if (require.main === module) {
    seedRegistrationStatuses(prisma)
        .then((statuses) => {
            console.log('Tournament registration statuses seeded:', statuses.map(({ name }) => name));
        })
        .catch((error) => {
            console.error('Failed to seed tournament registration statuses:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = seedRegistrationStatuses;
