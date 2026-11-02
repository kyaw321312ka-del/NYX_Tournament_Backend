require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../../src/shared/database/prisma');

const TEST_USERS = [
    { name: 'Test Player 1', email: 'godnear259@gmail.com' },
    { name: 'Test Player 2', email: 'kyaw321312ka@gmail.com' },
    { name: 'Test Player 3', email: 'kl2578233@gmail.com' },
];

async function seedTestUsers(database, env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Test users cannot be seeded in production.');
    }

    const password = env.TEST_USERS_PASSWORD;
    const passwordBytes = password ? Buffer.byteLength(password, 'utf8') : 0;
    if (passwordBytes < 12 || passwordBytes > 72) {
        throw new Error('Set TEST_USERS_PASSWORD to a password between 12 and 72 bytes.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return database.$transaction(async (transaction) => {
        const role = await transaction.role.upsert({
            where: { name: 'user' },
            create: { name: 'user' },
            update: {},
        });
        const results = [];

        for (const testUser of TEST_USERS) {
            const existingUser = await transaction.user.findUnique({
                where: { email: testUser.email },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: { select: { name: true } },
                },
            });

            if (existingUser) {
                results.push({ created: false, user: existingUser });
                continue;
            }

            const user = await transaction.user.create({
                data: {
                    ...testUser,
                    passwordHash,
                    emailVerifiedAt: new Date(),
                    roleId: role.id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: { select: { name: true } },
                },
            });
            results.push({ created: true, user });
        }

        return results;
    });
}

if (require.main === module) {
    seedTestUsers(prisma, process.env)
        .then((results) => {
            for (const { created, user } of results) {
                console.log(created ? 'Test user created:' : 'Test user already exists; left unchanged:', user);
            }
        })
        .catch((error) => {
            console.error('Failed to seed test users:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = seedTestUsers;
