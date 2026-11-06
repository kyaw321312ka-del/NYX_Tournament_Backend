require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../../src/shared/database/prisma');

async function seedAdmin(database, env) {
    const email = env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = env.ADMIN_PASSWORD;
    const name = env.ADMIN_NAME?.trim() || 'NYX Administrator';

    if (!email || !zodEmailIsValid(email)) {
        throw new Error('Set ADMIN_EMAIL to a valid email address before seeding.');
    }

    if (!password || Buffer.byteLength(password, 'utf8') < 12 || Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error('ADMIN_PASSWORD must be between 12 and 72 bytes.');
    }

    if (name.length < 1 || name.length > 150) {
        throw new Error('ADMIN_NAME must be between 1 and 150 characters.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    return database.$transaction(async (transaction) => {
        const role = await transaction.role.upsert({
            where: { name: 'admin' },
            create: { name: 'admin' },
            update: {},
        });

        const existingUser = await transaction.user.findUnique({
            where: { email },
            include: { role: true },
        });

        if (existingUser) {
            if (existingUser.role.name !== 'admin') {
                throw new Error('ADMIN_EMAIL already belongs to a non-admin account.');
            }
            return { created: false, user: existingUser };
        }

        const user = await transaction.user.create({
            data: {
                name,
                gender: 'male',
                email,
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

        return { created: true, user };
    });
}

function zodEmailIsValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

if (require.main === module) {
    seedAdmin(prisma, process.env)
        .then(({ created, user }) => {
            console.log(created ? 'Admin account created:' : 'Admin account already exists:', user);
        })
        .catch((error) => {
            console.error('Failed to seed admin:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = seedAdmin;
