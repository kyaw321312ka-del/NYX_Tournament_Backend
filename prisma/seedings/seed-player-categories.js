require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const PLAYER_CATEGORIES = [
    { categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
    { categoryCode: 'WS', name: "Women's Singles", pairingType: 'singles' },
    { categoryCode: 'MD', name: "Men's Doubles", pairingType: 'doubles' },
    { categoryCode: 'WD', name: "Women's Doubles", pairingType: 'doubles' },
    { categoryCode: 'XD', name: 'Mixed Doubles', pairingType: 'mixed_doubles' },
];

async function seedPlayerCategories(database, env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Player categories cannot be seeded in production.');
    }

    return database.$transaction(async (transaction) => {
        const categories = [];
        for (const category of PLAYER_CATEGORIES) {
            categories.push(await transaction.category.upsert({
                where: { name: category.name },
                create: category,
                update: {
                    categoryCode: category.categoryCode,
                    pairingType: category.pairingType,
                },
            }));
        }
        return categories;
    });
}

if (require.main === module) {
    seedPlayerCategories(prisma, process.env)
        .then((categories) => {
            console.log('Player categories seeded:', categories);
        })
        .catch((error) => {
            console.error('Failed to seed player categories:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = seedPlayerCategories;
