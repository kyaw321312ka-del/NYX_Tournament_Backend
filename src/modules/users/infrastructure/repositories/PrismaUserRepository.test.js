const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaUserRepository = require('./PrismaUserRepository');

test('updates the profile image and returns the previous URL for cleanup', async () => {
    const calls = [];
    const prisma = {
        $transaction: async (callback) => callback({
            user: {
                findUnique: async (args) => {
                    calls.push(['findUnique', args]);
                    return { id: 7, profileImageUrl: '/uploads/player-profiles/old.jpg' };
                },
                update: async (args) => {
                    calls.push(['update', args]);
                    return {
                        id: 7,
                        name: 'Player',
                        email: 'player@example.com',
                        profileImageUrl: args.data.profileImageUrl,
                    };
                },
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    const result = await repository.updateProfileImage(7, '/uploads/player-profiles/new.png');

    assert.equal(result.user.profileImageUrl, '/uploads/player-profiles/new.png');
    assert.equal(result.previousProfileImageUrl, '/uploads/player-profiles/old.jpg');
    assert.equal(calls[0][1].where.id, 7);
    assert.equal(calls[1][1].data.profileImageUrl, '/uploads/player-profiles/new.png');
});

test('returns not found when the authenticated user does not exist', async () => {
    const prisma = {
        $transaction: async (callback) => callback({
            user: {
                findUnique: async () => null,
                update: async () => assert.fail('Must not update a missing user'),
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    await assert.rejects(
        repository.updateProfileImage(404, '/uploads/player-profiles/new.png'),
        (error) => error.statusCode === 404,
    );
});
