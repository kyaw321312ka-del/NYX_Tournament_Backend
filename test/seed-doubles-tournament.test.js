const test = require('node:test');
const assert = require('node:assert/strict');
const {
    seedDoublesTournament,
    getTestDoublesTeams,
} = require('../prisma/seedings/seed-doubles-tournament');

const validEnvironment = {
    NODE_ENV: 'development',
    SEED_TEST_DATA: 'true',
    TEST_USERS_PASSWORD: 'strong-test-password',
    ADMIN_EMAIL: 'admin@example.com',
};

function createSeedContext() {
    const calls = {
        users: [],
        registrations: [],
        members: [],
        payments: [],
        drawConfigurations: 0,
    };
    const users = new Map();
    const registrations = [];
    let nextUserId = 10;
    let nextRegistrationId = 100;

    const database = {
        user: {
            findUnique: async () => ({ id: 1, role: { name: 'admin' } }),
        },
        tournament: {
            findFirst: async () => ({ id: 8 }),
        },
        tournamentPayment: {
            findFirst: async () => null,
        },
        $transaction: async (callback) => callback({
            role: { upsert: async () => ({ id: 2 }) },
            category: {
                upsert: async ({ create }) => {
                    assert.equal(create.categoryCode, 'MD');
                    assert.equal(create.pairingType, 'doubles');
                    return { id: 3 };
                },
            },
            tournamentCategory: {
                findFirst: async () => null,
                create: async ({ data }) => {
                    assert.equal(data.tournamentId, 8);
                    assert.equal(data.categoryId, 3);
                    return { id: 18 };
                },
            },
            tournamentDrawConfiguration: {
                upsert: async () => { calls.drawConfigurations += 1; },
            },
            categoryPointTier: { upsert: async () => ({}) },
            tournamentRegistrationStatus: {
                upsert: async () => ({ id: 4 }),
            },
            paymentMethod: {
                findFirst: async () => ({
                    id: 5,
                    paymentMethodName: 'NYX Seed Test Payment',
                    accountName: 'NYX Test Account',
                    accountNumber: 'TEST-NO-REAL-ACCOUNT',
                }),
            },
            user: {
                findUnique: async ({ where }) => users.get(where.email) ?? null,
                create: async ({ data }) => {
                    const user = {
                        id: nextUserId++,
                        name: data.name,
                        role: { name: 'user' },
                    };
                    users.set(data.email, user);
                    calls.users.push(data);
                    return { id: user.id };
                },
                update: async ({ where }) => ({ id: where.id }),
            },
            userProfile: { upsert: async () => ({}) },
            userCategory: { upsert: async () => ({}) },
            tournamentRegistration: {
                findFirst: async ({ where }) => registrations.find((registration) => (
                    registration.registeredBy === where.registeredBy
                    && registration.members.some(
                        ({ userId }) => userId === where.members.some.userId,
                    )
                )) ?? null,
                create: async ({ data }) => {
                    const registration = {
                        id: nextRegistrationId++,
                        registeredBy: data.registeredBy,
                        data,
                        members: data.members.create,
                    };
                    registrations.push(registration);
                    calls.registrations.push(data);
                    return { id: registration.id };
                },
            },
            tournamentRegistrationMember: {
                upsert: async (args) => { calls.members.push(args); },
            },
            tournamentPayment: {
                findFirst: async () => null,
                create: async ({ data }) => { calls.payments.push(data); },
            },
        }),
    };
    const proofStorage = {
        save: async () => 'test-proof.png',
        read: async () => {
            const error = new Error('Missing test proof.');
            error.statusCode = 404;
            throw error;
        },
        remove: async () => {},
    };

    return { calls, database, proofStorage };
}

test('creates the requested number of distinct two-player teams', () => {
    const teams = getTestDoublesTeams(15);
    const players = teams.flat();

    assert.equal(teams.length, 15);
    assert.ok(teams.every((team) => team.length === 2));
    assert.equal(new Set(players.map(({ email }) => email)).size, 30);
});

test('seeds 15 confirmed paid doubles registrations without creating a draw', async () => {
    const context = createSeedContext();
    const result = await seedDoublesTournament(
        context.database,
        validEnvironment,
        { proofStorage: context.proofStorage },
    );

    assert.equal(result.tournamentId, 8);
    assert.equal(result.tournamentCategoryId, 18);
    assert.equal(result.teamCount, 15);
    assert.equal(result.playerCount, 30);
    assert.equal(result.registrationCount, 15);
    assert.equal(result.drawId, null);
    assert.equal(context.calls.users.length, 30);
    assert.equal(context.calls.registrations.length, 15);
    assert.ok(context.calls.registrations.every(({ statusId, members }) => (
        statusId === 4 && members.create.length === 2
    )));
    assert.equal(context.calls.members.length, 30);
    assert.equal(context.calls.payments.length, 15);
    assert.ok(context.calls.payments.every(({ status, amount }) => (
        status === 'paid' && amount === 10000
    )));
    assert.equal(context.calls.drawConfigurations, 1);
});

test('creates a published doubles draw and seeds its matches when requested', async () => {
    const context = createSeedContext();
    const calls = { drafts: 0, assignments: [], publishes: 0, results: [] };
    let publishedDraw = null;
    const drawRepository = {
        getLatestDraw: async () => {
            if (!publishedDraw) {
                const error = new Error('No draw.');
                error.statusCode = 404;
                throw error;
            }
            return publishedDraw;
        },
        createDraft: async (categoryId, configuration) => {
            calls.drafts += 1;
            assert.equal(categoryId, 18);
            assert.deepEqual(configuration, {
                drawFormat: 'SINGLE_ELIMINATION',
                seedingMethod: 'MANUAL',
            });
            return { id: 50 };
        },
        assignPositions: async (drawId, assignments) => {
            calls.assignments.push({ drawId, assignments });
        },
        publish: async (drawId) => {
            calls.publishes += 1;
            const assignments = calls.assignments[0].assignments;
            publishedDraw = {
                id: drawId,
                version: 1,
                status: 'PUBLISHED',
                configurationSnapshot: {
                    eligibleRegistrationIds: assignments.map(({ registrationId }) => registrationId),
                },
                participants: assignments.map(({ registrationId }) => ({ registrationId })),
            };
            return publishedDraw;
        },
    };
    const seedMatchResults = async (database, env, dependencies, options) => {
        calls.results.push({ database, env, dependencies, options });
        return { seededMatchCount: 14, pendingMatchCount: 0 };
    };

    const result = await seedDoublesTournament(
        context.database,
        validEnvironment,
        {
            proofStorage: context.proofStorage,
            drawRepository,
            seedMatchResults,
        },
        { createDraw: true, seedResults: true },
    );

    assert.equal(result.drawId, 50);
    assert.equal(result.drawVersion, 1);
    assert.deepEqual(result.matchResults, {
        seededMatchCount: 14,
        pendingMatchCount: 0,
    });
    assert.equal(calls.drafts, 1);
    assert.equal(calls.publishes, 1);
    assert.equal(calls.assignments[0].assignments.length, 15);
    assert.equal(new Set(calls.assignments[0].assignments.map(
        ({ registrationId }) => registrationId,
    )).size, 15);
    assert.equal(calls.results.length, 1);
    assert.deepEqual(calls.results[0].options, { categoryCode: 'MD' });
});

test('refuses to seed doubles test data in production', async () => {
    const context = createSeedContext();

    await assert.rejects(
        seedDoublesTournament(context.database, {
            ...validEnvironment,
            NODE_ENV: 'production',
        }, { proofStorage: context.proofStorage }),
        /cannot be seeded in production/,
    );
    assert.equal(context.calls.users.length, 0);
});
