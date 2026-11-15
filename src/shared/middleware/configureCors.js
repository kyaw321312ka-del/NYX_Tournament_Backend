const cors = require('cors');

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

function createCorsMiddleware(origins = process.env.CORS_ORIGINS) {
    const allowedOrigins = origins
        ? origins.split(',').map((origin) => origin.trim()).filter(Boolean)
        : DEFAULT_ALLOWED_ORIGINS;
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
