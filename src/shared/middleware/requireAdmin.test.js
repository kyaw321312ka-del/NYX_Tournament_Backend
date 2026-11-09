const test = require('node:test');
const assert = require('node:assert/strict');
const createRequireAdmin = require('./requireAdmin');

test('checks current database role instead of trusting token role claims', async () => {
    const middleware = createRequireAdmin({
        user: {
            findUnique: async () => ({ role: { name: 'user' } }),
        },
    });
    const req = { auth: { userId: 7, roleId: 1 } };
    let forwardedError;

    await middleware(req, {}, (error) => {
        forwardedError = error;
    });

    assert.equal(forwardedError.statusCode, 403);
});

test('allows an administrator from the current database role', async () => {
    const middleware = createRequireAdmin({
        user: {
            findUnique: async () => ({ role: { name: 'admin' } }),
        },
    });
    let continued = false;

    await middleware({ auth: { userId: 1, roleId: 2 } }, {}, (error) => {
        assert.equal(error, undefined);
        continued = true;
    });

    assert.equal(continued, true);
});
