require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const PLAYER_CATEGORIES = [
    "Men's Singles",
    "Women's Singles",
    "Men's Doubles",
    "Women's Doubles",
    'Mixed Doubles',
];

async function seedPlayerCategories(database, env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Player categories cannot be seeded in production.');
    }

    return database.$transaction(async (transaction) => {
        const categories = [];
        for (const name of PLAYER_CATEGORIES) {
            categories.push(await transaction.category.upsert({
                where: { name },
                create: { name },
                update: {},
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
