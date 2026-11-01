require('dotenv').config();

const app = require('./app');
const { port } = require('./config/server');

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

function shutdown(signal) {
    console.log(`${signal} received. Closing HTTP server.`);
    server.close(async (error) => {
        if (error) {
            console.error('Failed to close HTTP server:', error);
            process.exitCode = 1;
        }

        try {
            const prisma = require('./shared/database/prisma');
            await prisma.$disconnect();
        } catch (disconnectError) {
            console.error('Failed to disconnect from database:', disconnectError);
            process.exitCode = 1;
        }
    });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
