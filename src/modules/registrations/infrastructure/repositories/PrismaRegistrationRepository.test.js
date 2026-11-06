const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaRegistrationRepository = require('./PrismaRegistrationRepository');

function createRepository({
    category = {
        entryStatus: 'open',
        pairingType: 'singles',
        tournament: { publicationStatus: 'published' },
    },
    duplicate = null,
    transactionError = null,
} = {}) {
    const calls = {
        category: [],
        duplicates: [],
        status: [],
        create: [],
    };
    const transaction = {
        tournamentCategory: {
            findUnique: async (args) => {
                calls.category.push(args);
                return category;
            },
        },
        tournamentRegistration: {
            findFirst: async (args) => {
                calls.duplicates.push(args);
                return duplicate;
            },
            create: async (args) => {
                calls.create.push(args);
                return {
                    id: 21,
                    tournamentCategoryId: args.data.tournamentCategoryId,
                    registeredBy: args.data.registeredBy,
                    statusId: args.data.statusId,
                    registeredAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-01T00:00:00Z'),
                    category,
                    creator: { id: args.data.registeredBy, name: 'Player' },
                    status: { id: args.data.statusId, name: 'pending' },
                    members: args.data.members.create.map(({ userId }) => ({
                        id: userId,
                        userId,
                        user: { id: userId, name: `Player ${userId}`, email: `player${userId}@example.com` },
                    })),
                };
            },
        },
        tournamentRegistrationStatus: {
            upsert: async (args) => {
                calls.status.push(args);
                return { id: 4, name: 'pending' };
            },
        },
    };
    const prisma = {
        $transaction: async (callback) => {
            if (transactionError) throw transactionError;
            return callback(transaction);
        },
    };

    return {
        repository: new PrismaRegistrationRepository(prisma),
        calls,
    };
}

test('creates a pending singles registration with the authenticated user as registrant and member', async () => {
    const { repository, calls } = createRepository();

    const registration = await repository.create({
        userId: 7,
        tournamentCategoryId: 3,
    });

    assert.equal(registration.registeredBy, 7);
    assert.equal(registration.status.name, 'pending');
    assert.deepEqual(registration.members.map(({ userId }) => userId), [7]);
    assert.equal(calls.create.length, 1);
    assert.deepEqual(calls.create[0].data.members.create, [{
        userId: 7,
        tournamentCategoryId: 3,
    }]);
    assert.equal(calls.create[0].data.registeredBy, 7);
    assert.deepEqual(calls.status[0].where, { name: 'pending' });
});

test('maps database uniqueness conflicts to a registration conflict response', async () => {
    const { repository } = createRepository({
        transactionError: { code: 'P2002' },
    });

    await assert.rejects(
        repository.create({ userId: 7, tournamentCategoryId: 3 }),
        (error) => error.statusCode === 409 && /already registered/.test(error.message),
    );
});

test('requires a partner invitation rather than allowing a direct doubles registration', async () => {
    const { repository, calls } = createRepository({
        category: {
            entryStatus: 'open',
            pairingType: 'doubles',
            tournament: { publicationStatus: 'published' },
        },
    });

    await assert.rejects(
        repository.create({
            userId: 7,
            tournamentCategoryId: 3,
            members: [8],
        }),
        (error) => error.statusCode === 400 && /partner invitation/.test(error.message),
    );
    assert.equal(calls.create.length, 0);
});

test('rejects unpublished, closed, incorrectly sized, and duplicate registrations before creating records', async (t) => {
    const cases = [
        {
            name: 'unpublished tournament',
            category: {
                entryStatus: 'open',
                pairingType: 'singles',
                tournament: { publicationStatus: 'draft' },
            },
            members: [],
            statusCode: 409,
            message: /not published/,
        },
        {
            name: 'closed category',
            category: {
                entryStatus: 'closed',
                pairingType: 'singles',
                tournament: { publicationStatus: 'published' },
            },
            members: [],
            statusCode: 409,
            message: /not open/,
        },
        {
            name: 'singles registration with multiple players',
            category: {
                entryStatus: 'open',
                pairingType: 'singles',
                tournament: { publicationStatus: 'published' },
            },
            members: [8],
            statusCode: 400,
            message: /exactly one player/,
        },
        {
            name: 'doubles category without accepted partner invitation',
            category: {
                entryStatus: 'open',
                pairingType: 'doubles',
                tournament: { publicationStatus: 'published' },
            },
            members: [],
            statusCode: 400,
            message: /partner invitation/,
        },
        {
            name: 'player already registered in the category',
            category: {
                entryStatus: 'open',
                pairingType: 'singles',
                tournament: { publicationStatus: 'published' },
            },
            duplicate: { id: 15 },
            members: [],
            statusCode: 409,
            message: /already registered/,
        },
    ];

    for (const scenario of cases) {
        await t.test(scenario.name, async () => {
            const { repository, calls } = createRepository(scenario);

            await assert.rejects(
                repository.create({
                    userId: 7,
                    tournamentCategoryId: 3,
                    members: scenario.members,
                }),
                (error) => error.statusCode === scenario.statusCode && scenario.message.test(error.message),
            );

            assert.equal(calls.create.length, 0);
            assert.equal(calls.status.length, 0);
        });
    }
});
