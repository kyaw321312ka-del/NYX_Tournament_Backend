const bcrypt = require('bcryptjs');
const prisma = require('../../src/shared/database/prisma');

async function main() {
    const email = 'admin@gmail.com';
    const password = 'admin123';

    const adminRole = await prisma.role.findUnique({
        where: { name: 'admin' },
    });

    if (!adminRole) {
        throw new Error('Admin role does not exist.');
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log('Admin account already exists.');
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
        data: {
            name: 'NYX Administrator',
            email,
            passwordHash,
            emailVerifiedAt: new Date(),
            roleId: adminRole.id,
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: {
                select: { name: true },
            },
        },
    });

    console.log('Admin account created:', admin);
}

main()
    .catch((error) => {
        console.error('Failed to create admin:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });