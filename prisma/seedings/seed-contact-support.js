require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const CONTACT_SUPPORT = {
    phone: '+95 9 123 456 789',
    website: 'www.nyxbadminton.com',
    email: 'support@nyxbadminton.com',
    address: '73 rd St, Between 102nd & 103rd, Chanmyathazi, Mandalay',
};

async function seedContactSupport(database, env = process.env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Contact and support seed data cannot be written in production.');
    }
    return database.contactSupport.upsert({
        where: { id: 1 },
        create: { id: 1, ...CONTACT_SUPPORT },
        update: CONTACT_SUPPORT,
    });
}

if (require.main === module) {
    seedContactSupport(prisma)
        .then((contactSupport) => {
            console.log('Contact and support details seeded:', contactSupport);
        })
        .catch((error) => {
            console.error('Failed to seed contact and support details:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = {
    seedContactSupport,
    CONTACT_SUPPORT,
};
