const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaTokenRevocationRepository = require('./PrismaTokenRevocationRepository');

test('revokes a token and removes expired revocation records', async () => {
    const calls = [];
    const prisma = {
        $transaction: async (callback) => callback({
            revokedAccessToken: {
                deleteMany: async (args) => calls.push(['deleteMany', args]),
                upsert: async (args) => calls.push(['upsert', args]),
            },
        }),
    };
    const repository = new PrismaTokenRevocationRepository(prisma);
    const expiresAt = new Date(Date.now() + 60000);

    await repository.revoke('token-id', expiresAt);

    assert.equal(calls[0][1].where.expiresAt.lte instanceof Date, true);
    assert.deepEqual(calls[1][1], {
        where: { tokenId: 'token-id' },
        create: { tokenId: 'token-id', expiresAt },
        update: { expiresAt },
    });
});

test('checks whether a token ID has been revoked', async () => {
    const prisma = {
        revokedAccessToken: {
            findUnique: async ({ where }) => (where.tokenId === 'revoked' ? { tokenId: 'revoked' } : null),
        },
    };
    const repository = new PrismaTokenRevocationRepository(prisma);

    assert.equal(await repository.isRevoked('revoked'), true);
    assert.equal(await repository.isRevoked('active'), false);
});
