const cors = require('cors');

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://nyxtournament.com',
    'https://www.nyxtournament.com',
];

function createCorsMiddleware(origins = process.env.CORS_ORIGINS) {
    const configuredOrigins = origins
        ? origins.split(',').map((origin) => origin.trim()).filter(Boolean)
        : [];
    const allowedOrigins = [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];
    const allowedOriginSet = new Set(allowedOrigins);

    return cors({
        origin(origin, callback) {
            callback(null, !origin || allowedOriginSet.has(origin));
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
}

module.exports = createCorsMiddleware;
