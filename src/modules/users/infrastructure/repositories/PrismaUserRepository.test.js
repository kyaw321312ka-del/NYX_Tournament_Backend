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

test('lists player rows with cumulative points and identity-review status', async () => {
    let userQuery;
    let pointQuery;
    const prisma = {
        user: {
            findMany: async (args) => {
                userQuery = args;
                return [
                    {
                        id: 8842,
                        name: 'Min Thant',
                        email: 'minthant@example.com',
                        phno: '09250123789',
                        profile: { clubName: 'Yangon Badminton Club' },
                        identityDocuments: { verificationStatus: 'approved' },
                    },
                    {
                        id: 8843,
                        name: 'Aung Myo',
                        email: 'aungmyo@example.com',
                        phno: '09252998877',
                        profile: { clubName: 'Mandalay Heroes Club' },
                        identityDocuments: { verificationStatus: 'pending' },
                    },
                ];
            },
            count: async () => 2,
        },
        tournamentRankingPointAward: {
            groupBy: async (args) => {
                pointQuery = args;
                return [{ userId: 8843, _sum: { points: 3650 } }];
            },
        },
    };
    const repository = new PrismaUserRepository(prisma);

    const result = await repository.listPlayers({ page: 1, pageSize: 20 });

    assert.equal(userQuery.skip, 0);
    assert.equal(userQuery.take, 20);
    assert.deepEqual(pointQuery.where.userId.in, [8842, 8843]);
    assert.deepEqual(result.items, [
        {
            id: 8842,
            playerId: '#NYX-8842',
            athleteName: 'Min Thant',
            teamClub: 'Yangon Badminton Club',
            contactEmail: 'minthant@example.com',
            phoneNumber: '09250123789',
            points: 0,
            status: 'Active',
        },
        {
            id: 8843,
            playerId: '#NYX-8843',
            athleteName: 'Aung Myo',
            teamClub: 'Mandalay Heroes Club',
            contactEmail: 'aungmyo@example.com',
            phoneNumber: '09252998877',
            points: 3650,
            status: 'Pending',
        },
    ]);
    assert.deepEqual(result.pagination, { page: 1, pageSize: 20, total: 2, pageCount: 1 });
});

test('returns admin player details without exposing private identity-document filenames', async () => {
    const prisma = {
        user: {
            findFirst: async () => ({
                id: 8843,
                name: 'Aung Myo',
                email: 'aungmyo@example.com',
                phno: '09252998877',
                emailVerifiedAt: new Date('2026-11-19T07:34:00.000Z'),
                createdAt: new Date('2026-11-19T07:34:00.000Z'),
                updatedAt: new Date('2026-11-19T07:34:00.000Z'),
                profile: {
                    clubName: 'Mandalay Heroes Club',
                    address: 'Mandalay',
                    gender: 'male',
                    birthday: new Date('1998-04-15T00:00:00.000Z'),
                    profileImageUrl: '/uploads/player-profiles/player.png',
                },
                categories: [{
                    category: {
                        id: 1,
                        categoryCode: 'MS',
                        name: "Men's Singles",
                        pairingType: 'singles',
                    },
                }],
                identityDocuments: {
                    frontImageUrl: 'private-front.jpg',
                    backImageUrl: 'private-back.jpg',
                    verificationStatus: 'approved',
                },
            }),
        },
        tournamentRankingPointAward: {
            findMany: async () => [{
                position: 1,
                label: 'Champion',
                points: 3650,
                awardedAt: new Date('2026-11-19T07:34:00.000Z'),
                tournamentCategory: {
                    tournament: { title: 'NYX Open' },
                    eventCategory: { categoryCode: 'MS', name: "Men's Singles" },
                },
            }],
        },
    };
    const repository = new PrismaUserRepository(prisma);

    const result = await repository.getPlayerDetails(8843);

    assert.equal(result.playerId, '#NYX-8843');
    assert.equal(result.birthday, '1998-04-15');
    assert.equal(result.identityDocuments.verificationStatus, 'approved');
    assert.equal(result.identityDocuments.frontIdImg, '/api/admin/users/8843/identity-documents/front');
    assert.equal(result.identityDocuments.backIdImg, '/api/admin/users/8843/identity-documents/back');
    assert.equal(result.points, 3650);
    assert.equal(result.rankingPointAwards[0].tournamentTitle, 'NYX Open');
    assert.equal('frontImageUrl' in result.identityDocuments, false);
});

test('looks up identity document filenames only for player accounts', async () => {
    let query;
    const repository = new PrismaUserRepository({
        user: {
            findFirst: async (args) => {
                query = args;
                return { identityDocuments: { frontImageUrl: 'generated-front.jpg' } };
            },
        },
    });

    assert.equal(await repository.getIdentityDocumentFilename(7, 'front'), 'generated-front.jpg');
    assert.deepEqual(query.where, { id: 7, role: { is: { name: 'user' } } });
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

test('reviews identity documents and requires both sides before approval', async () => {
    const calls = [];
    const prisma = {
        $transaction: async (callback) => callback({
            userIdentityDocuments: {
                findUnique: async (args) => {
                    calls.push(['findUnique', args]);
                    return { frontImageUrl: 'front.jpg', backImageUrl: 'back.jpg' };
                },
                update: async (args) => {
                    calls.push(['update', args]);
                    return {
                        userId: 7,
                        frontImageUrl: 'front.jpg',
                        backImageUrl: 'back.jpg',
                        verificationStatus: 'approved',
                        user: { name: 'Test Player', email: 'player@example.com' },
                    };
                },
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    const result = await repository.reviewIdentityDocuments(7, 'approved');

    assert.deepEqual(result, {
        userId: 7,
        name: 'Test Player',
        email: 'player@example.com',
        frontUploaded: true,
        backUploaded: true,
        verificationStatus: 'approved',
    });
    assert.deepEqual(calls[1][1].data, { verificationStatus: 'approved' });
});

test('does not approve identity documents when either side is missing', async () => {
    let updated = false;
    const prisma = {
        $transaction: async (callback) => callback({
            userIdentityDocuments: {
                findUnique: async () => ({ frontImageUrl: 'front.jpg', backImageUrl: null }),
                update: async () => {
                    updated = true;
                },
            },
        }),
    };
    const repository = new PrismaUserRepository(prisma);

    await assert.rejects(
        repository.reviewIdentityDocuments(7, 'approved'),
        (error) => error.statusCode === 409,
    );
    assert.equal(updated, false);
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
