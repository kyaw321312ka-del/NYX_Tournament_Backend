const test = require('node:test');
const assert = require('node:assert/strict');
const createAuthenticate = require('./authenticate');

function createRequest() {
    return {
        get: (name) => (name === 'authorization' ? 'Bearer valid-token' : undefined),
    };
}

test('rejects a revoked access token', async () => {
    let receivedError;
    const authenticate = createAuthenticate(
        { verify: () => ({ userId: 7, tokenId: 'revoked-token' }) },
        { isRevoked: async () => true },
    );

    await authenticate(createRequest(), {}, (error) => {
        receivedError = error;
    });

    assert.equal(receivedError.statusCode, 401);
});

test('sets authenticated identity for an active access token', async () => {
    const req = createRequest();
    const authenticate = createAuthenticate(
        { verify: () => ({ userId: 7, tokenId: 'active-token' }) },
        { isRevoked: async () => false },
    );
    let nextCalled = false;

    await authenticate(req, {}, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.auth.userId, 7);
});
