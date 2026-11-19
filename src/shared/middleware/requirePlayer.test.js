const test = require('node:test');
const assert = require('node:assert/strict');
const createRequirePlayer = require('./requirePlayer');

test('checks the current database role and blocks administrators', async () => {
    const requirePlayer = createRequirePlayer({
        user: {
            findUnique: async () => ({ role: { name: 'admin' } }),
        },
    });

    await requirePlayer({ auth: { userId: 1 } }, {}, (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.message, 'Only players can access this resource.');
    });
});

test('allows an account with the user role', async () => {
    const requirePlayer = createRequirePlayer({
        user: {
            findUnique: async () => ({ role: { name: 'user' } }),
        },
    });

    await new Promise((resolve, reject) => {
        requirePlayer({ auth: { userId: 7 } }, {}, (error) => {
            if (error) reject(error);
            else resolve();
        });
    });
});
