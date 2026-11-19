const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaUserRepository = require('./PrismaUserRepository');

test('updates profile categories and returns replaced image references', async () => {
    let updateArgs;
    const prisma = {
        $transaction: async (callback) => callback({
            user: {
                findUnique: async () => ({
                    id: 7,
                    email: 'player@example.com',
                    profile: { profileImageUrl: '/old-profile.png' },
                    identityDocuments: {
                        frontImageUrl: 'old-front.jpg',
                        backImageUrl: 'old-back.jpg',
                    },
                }),
                update: async (args) => {
                    updateArgs = args;
                    return { id: 7, role: { name: 'user' }, categories: [] };
                },
            },
            category: {
                findMany: async () => [{ id: 1 }, { id: 2 }],
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    const result = await repository.updateProfile(7, {
        name: 'Updated Player',
        profileImageUrl: '/new-profile.png',
        frontIdImg: 'new-front.jpg',
    }, undefined, [1, 2]);

    assert.deepEqual(updateArgs.data.categories, {
        deleteMany: {},
        create: [
            { category: { connect: { id: 1 } } },
            { category: { connect: { id: 2 } } },
        ],
    });
    assert.deepEqual(updateArgs.data.profile, {
        upsert: {
            create: { profileImageUrl: '/new-profile.png' },
            update: { profileImageUrl: '/new-profile.png' },
        },
    });
    assert.deepEqual(updateArgs.data.identityDocuments, {
        upsert: {
            create: {
                frontImageUrl: 'new-front.jpg',
                verificationStatus: 'pending',
            },
            update: {
                frontImageUrl: 'new-front.jpg',
                verificationStatus: 'pending',
            },
        },
    });
    assert.deepEqual(result.previousFiles, {
        profileImageUrl: '/old-profile.png',
        frontIdImg: 'old-front.jpg',
        backIdImg: null,
    });
});

test('rejects invalid profile categories without updating the user', async () => {
    const prisma = {
        $transaction: async (callback) => callback({
            user: {
                findUnique: async () => ({ id: 7, email: 'player@example.com' }),
                update: async () => assert.fail('Must not update an invalid category selection'),
            },
            category: {
                findMany: async () => [{ id: 1 }],
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    await assert.rejects(
        repository.updateProfile(7, {}, undefined, [1, 2]),
        (error) => error.statusCode === 400,
    );
});

test('updates the profile image and returns the previous URL for cleanup', async () => {
    const calls = [];
    const prisma = {
        $transaction: async (callback) => callback({
            user: {
                findUnique: async (args) => {
                    calls.push(['findUnique', args]);
                return {
                    id: 7,
                    profile: { profileImageUrl: '/uploads/player-profiles/old.jpg' },
                };
                },
                update: async (args) => {
                    calls.push(['update', args]);
                    return {
                        id: 7,
                        name: 'Player',
                        email: 'player@example.com',
                        profile: {
                            profileImageUrl: args.data.profile.upsert.update.profileImageUrl,
                        },
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
    assert.deepEqual(calls[1][1].data.profile.upsert.update, {
        profileImageUrl: '/uploads/player-profiles/new.png',
    });
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

test('updates only the submitted identity document columns and returns replaced filenames', async () => {
    let updateArgs;
    const prisma = {
        $transaction: async (callback) => callback({
            user: {
                findUnique: async () => ({
                    id: 7,
                    identityDocuments: {
                        frontImageUrl: 'old-front.jpg',
                        backImageUrl: 'old-back.jpg',
                    },
                }),
                update: async (args) => {
                    updateArgs = args;
                    return {
                        id: 7,
                        name: 'Player',
                        email: 'player@example.com',
                        identityDocuments: {
                            frontImageUrl: args.data.identityDocuments.upsert.update.frontImageUrl,
                            backImageUrl: 'old-back.jpg',
                        },
                    };
                },
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    const result = await repository.updateIdentityDocuments(7, { frontIdImg: 'new-front.jpg' });

    assert.deepEqual(updateArgs.data.identityDocuments.upsert.update, {
        frontImageUrl: 'new-front.jpg',
        verificationStatus: 'pending',
    });
    assert.equal(result.previousDocuments.frontIdImg, 'old-front.jpg');
    assert.equal(result.previousDocuments.backIdImg, null);
});
