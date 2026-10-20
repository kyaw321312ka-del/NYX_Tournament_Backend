
const prisma = require('./src/config/prisma');

async function main() {
    try {
        const result = await prisma.$queryRaw`SELECT 1 AS connected`;
        console.log('Database connection successful:', result);
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
