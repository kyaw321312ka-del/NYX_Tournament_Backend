require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const TOURNAMENT_TITLE = 'NYX Registration Test Open 2027';
const CATEGORIES = [
    {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        entryFee: 10000,
        pairingType: 'singles',
    },
    {
        categoryCode: 'WS',
        categoryName: 'Women Singles',
        entryFee: 10000,
        pairingType: 'singles',
    },
    {
        categoryCode: 'MD',
        categoryName: 'Men Doubles',
        entryFee: 20000,
        pairingType: 'doubles',
    },
    {
        categoryCode: 'WD',
        categoryName: 'Women Doubles',
        entryFee: 20000,
        pairingType: 'doubles',
    },
    {
        categoryCode: 'XD',
        categoryName: 'Mixed Doubles',
        entryFee: 20000,
        pairingType: 'mixed_doubles',
    },
];

const DRAW_CONFIGURATIONS = {
    MS: {
        drawFormat: 'SINGLE_ELIMINATION',
        seedingMethod: 'RANDOM',
    },
    WS: {
        drawFormat: 'ROUND_ROBIN',
        seedingMethod: 'RANDOM',
    },
    MD: {
        drawFormat: 'GROUP_KNOCKOUT',
        seedingMethod: 'RANDOM',
        groupCount: 4,
        qualifiersPerGroup: 2,
    },
};

async function seedRegistrationTournament(database, env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Registration test tournaments cannot be seeded in production.');
    }

    const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail) {
        throw new Error('Set ADMIN_EMAIL to the seeded administrator account before seeding.');
    }

    return database.$transaction(async (transaction) => {
        const admin = await transaction.user.findUnique({
            where: { email: adminEmail },
            include: { role: true },
        });
        if (!admin || admin.role.name !== 'admin') {
            throw new Error('ADMIN_EMAIL must belong to an existing administrator account.');
        }

        let tournament = await transaction.tournament.findFirst({
            where: {
                createdBy: admin.id,
                title: TOURNAMENT_TITLE,
            },
            select: { id: true },
        });

        if (!tournament) {
            tournament = await transaction.tournament.create({
                data: {
                    createdBy: admin.id,
                    title: TOURNAMENT_TITLE,
                    description: 'Seeded tournament for testing singles and partner registrations.',
                    startDate: new Date('2027-02-20T00:00:00.000Z'),
                    endDate: new Date('2027-02-21T00:00:00.000Z'),
                    publicationStatus: 'published',
                },
                select: { id: true },
            });
        } else {
            await transaction.tournament.update({
                where: { id: tournament.id },
                data: { publicationStatus: 'published' },
            });
        }

        for (const category of CATEGORIES) {
            const categoryRecord = await transaction.tournamentCategory.upsert({
                where: {
                    tournamentId_categoryCode: {
                        tournamentId: tournament.id,
                        categoryCode: category.categoryCode,
                    },
                },
                create: {
                    tournamentId: tournament.id,
                    ...category,
                    entryStatus: 'open',
                    matchFormat: 'Best of 3 games',
                },
                update: {
                    categoryName: category.categoryName,
                    entryFee: category.entryFee,
                    pairingType: category.pairingType,
                    entryStatus: 'open',
                },
            });

            const drawConfiguration = DRAW_CONFIGURATIONS[category.categoryCode];
            if (drawConfiguration) {
                await transaction.tournamentDrawConfiguration.upsert({
                    where: { tournamentCategoryId: categoryRecord.id },
                    create: {
                        tournamentCategoryId: categoryRecord.id,
                        ...drawConfiguration,
                    },
                    update: drawConfiguration,
                });
            }
        }

        return transaction.tournament.findUnique({
            where: { id: tournament.id },
            include: {
                categories: {
                    where: { categoryCode: { in: CATEGORIES.map(({ categoryCode }) => categoryCode) } },
                    orderBy: { categoryCode: 'asc' },
                    select: {
                        id: true,
                        categoryCode: true,
                        categoryName: true,
                        entryFee: true,
                        pairingType: true,
                        entryStatus: true,
                        drawConfiguration: true,
                    },
                },
            },
        });
    });
}

if (require.main === module) {
    seedRegistrationTournament(prisma, process.env)
        .then((tournament) => {
            console.log('Registration test tournament is ready:', tournament);
        })
        .catch((error) => {
            console.error('Failed to seed registration test tournament:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = seedRegistrationTournament;
