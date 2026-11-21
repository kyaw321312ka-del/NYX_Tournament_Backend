require('dotenv').config();

const prisma = require('../../src/shared/database/prisma');

const AGE_GROUPS = Array.from({ length: 11 }, (_, index) => {
    const age = index + 10;
    return {
        name: `U${age}`,
        age,
    };
});

async function seedAgeGroups(database, env = process.env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Age groups cannot be seeded in production.');
    }

    return database.$transaction(async (transaction) => {
        const groups = [];
        for (const ageGroup of AGE_GROUPS) {
            groups.push(await transaction.ageGroup.upsert({
                where: {
                    name_age: {
                        name: ageGroup.name,
                        age: ageGroup.age,
                    },
                },
                create: ageGroup,
                update: {},
            }));
        }
        return groups;
    });
}

if (require.main === module) {
    seedAgeGroups(prisma)
        .then((groups) => {
            console.log(
                'Age groups seeded:',
                groups.map(({ name, age }) => `${name} (maximum age ${age})`).join(', '),
            );
        })
        .catch((error) => {
            console.error('Failed to seed age groups:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = {
    AGE_GROUPS,
    seedAgeGroups,
};
