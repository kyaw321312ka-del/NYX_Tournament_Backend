require('dotenv').config();

const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured.');
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const allowPublicKeyRetrieval =
    process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true' &&
    ['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname);

const adapter = new PrismaMariaDb({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: decodeURIComponent(databaseUrl.pathname.slice(1)),
    connectionLimit: 5,
    allowPublicKeyRetrieval,
});

module.exports = new PrismaClient({ adapter });
