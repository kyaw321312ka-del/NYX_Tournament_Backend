require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const TOURNAMENT_TITLE = 'NYX Registration Test Open 2027';
const CATEGORIES = [
    {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        pairingType: 'singles',
    },
    {
        categoryCode: 'MD',
        categoryName: 'Men Doubles',
        pairingType: 'doubles',
    },
    {
        categoryCode: 'XD',
        categoryName: 'Mixed Doubles',
        pairingType: 'mixed_doubles',
    },
];

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
            await transaction.tournamentCategory.upsert({
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
                    pairingType: category.pairingType,
                    entryStatus: 'open',
                },
            });
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
                        pairingType: true,
                        entryStatus: true,
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
