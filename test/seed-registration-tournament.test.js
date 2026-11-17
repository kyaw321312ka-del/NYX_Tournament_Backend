const test = require('node:test');
const assert = require('node:assert/strict');
const seedRegistrationTournament = require('../prisma/seedings/seed-registration-tournament');

function createDatabase({ existingTournament = null, admin = { id: 1, role: { name: 'admin' } } } = {}) {
    const calls = {
        transactionCount: 0,
        tournamentCreates: [],
        tournamentUpdates: [],
        categoryUpserts: [],
        categoryDefinitions: [],
        drawConfigurationUpserts: [],
    };
    const tournament = existingTournament ?? {
        id: 25,
        title: 'NYX Registration Test Open 2027',
        categories: [],
    };
    const database = {
        $transaction: async (callback) => {
            calls.transactionCount += 1;
            return callback({
                user: {
                    findUnique: async () => admin,
                },
                category: {
                    upsert: async (args) => {
                        calls.categoryDefinitions.push(args);
                        return { id: calls.categoryDefinitions.length + 10, ...args.create };
                    },
                },
                tournament: {
                    findFirst: async () => existingTournament,
                    create: async ({ data }) => {
                        calls.tournamentCreates.push(data);
                        return { id: 25 };
                    },
                    update: async (args) => {
                        calls.tournamentUpdates.push(args);
                        return { id: args.where.id };
                    },
                    findUnique: async () => tournament,
                },
                tournamentCategory: {
                    upsert: async (args) => {
                        calls.categoryUpserts.push(args);
                        return { id: calls.categoryUpserts.length, ...args.create };
                    },
                },
                tournamentDrawConfiguration: {
                    upsert: async (args) => {
                        calls.drawConfigurationUpserts.push(args);
                        return args.create;
                    },
                },
            });
        },
    };

    return { database, calls };
}

test('requires a configured admin before opening a database transaction', async () => {
    const { database, calls } = createDatabase();
    await assert.rejects(seedRegistrationTournament(database, {}), /ADMIN_EMAIL/);
    assert.equal(calls.transactionCount, 0);
});

test('refuses production seeding before opening a database transaction', async () => {
    const { database, calls } = createDatabase();
    await assert.rejects(
        seedRegistrationTournament(database, {
            NODE_ENV: 'production',
            ADMIN_EMAIL: 'admin@example.com',
        }),
        /cannot be seeded in production/,
    );
    assert.equal(calls.transactionCount, 0);
});

test('creates and publishes a tournament with all gender-eligible categories open', async () => {
    const { database, calls } = createDatabase();
    const result = await seedRegistrationTournament(database, {
        ADMIN_EMAIL: ' ADMIN@example.com ',
    });

    assert.equal(calls.tournamentCreates.length, 1);
    assert.equal(calls.tournamentCreates[0].createdBy, 1);
    assert.equal(calls.tournamentCreates[0].publicationStatus, 'published');
    assert.deepEqual(
        calls.categoryUpserts.map(({ create }) => [
            create.categoryId,
            create.entryStatus,
            create.entryFee,
        ]),
        [
            [11, 'open', 10000],
            [12, 'open', 10000],
            [13, 'open', 20000],
            [14, 'open', 20000],
            [15, 'open', 20000],
        ],
    );
    assert.deepEqual(
        calls.categoryDefinitions.map(({ create }) => [
            create.categoryCode,
            create.name,
            create.pairingType,
        ]),
        [
            ['MS', "Men's Singles", 'singles'],
            ['WS', "Women's Singles", 'singles'],
            ['MD', "Men's Doubles", 'doubles'],
            ['WD', "Women's Doubles", 'doubles'],
            ['XD', 'Mixed Doubles', 'mixed_doubles'],
        ],
    );
    assert.deepEqual(
        calls.drawConfigurationUpserts.map(({ create }) => [
            calls.categoryDefinitions[create.tournamentCategoryId - 1].create.categoryCode,
            create.drawFormat,
            create.seedingMethod,
            create.groupCount ?? null,
            create.qualifiersPerGroup ?? null,
        ]),
        [
            ['MS', 'SINGLE_ELIMINATION', 'RANDOM', null, null],
            ['WS', 'ROUND_ROBIN', 'RANDOM', null, null],
            ['MD', 'GROUP_KNOCKOUT', 'RANDOM', 4, 2],
        ],
    );
    assert.equal(result.id, 25);
    assert.deepEqual(calls.categoryUpserts[0].where, {
        tournamentId_categoryId: { tournamentId: 25, categoryId: 11 },
    });
});

test('reuses and publishes an existing seeded tournament idempotently', async () => {
    const existingTournament = { id: 33 };
    const { database, calls } = createDatabase({ existingTournament });

    await seedRegistrationTournament(database, {
        ADMIN_EMAIL: 'admin@example.com',
    });

    assert.equal(calls.tournamentCreates.length, 0);
    assert.equal(calls.tournamentUpdates.length, 1);
    assert.deepEqual(calls.tournamentUpdates[0], {
        where: { id: 33 },
        data: { publicationStatus: 'published' },
    });
    assert.ok(calls.categoryUpserts.every(({ where }) => (
        where.tournamentId_categoryId.tournamentId === 33
    )));
    assert.equal(calls.drawConfigurationUpserts.length, 3);
});

test('rejects a configured email that is not an administrator', async () => {
    const { database, calls } = createDatabase({
        admin: { id: 1, role: { name: 'user' } },
    });

    await assert.rejects(
        seedRegistrationTournament(database, { ADMIN_EMAIL: 'user@example.com' }),
        /existing administrator/,
    );
    assert.equal(calls.tournamentCreates.length, 0);
});
