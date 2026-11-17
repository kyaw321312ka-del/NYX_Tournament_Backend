const test = require('node:test');
const assert = require('node:assert/strict');
const seedPlayerCategories = require('../prisma/seedings/seed-player-categories');

test('upserts the standard badminton event categories', async () => {
    const calls = [];
    const database = {
        $transaction: async (callback) => callback({
            category: {
                upsert: async (args) => {
                    calls.push(args);
                    return { id: calls.length, ...args.create };
                },
            },
        }),
    };

    const categories = await seedPlayerCategories(database, {});
    const categoriesExpected = [
        { categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
        { categoryCode: 'WS', name: "Women's Singles", pairingType: 'singles' },
        { categoryCode: 'MD', name: "Men's Doubles", pairingType: 'doubles' },
        { categoryCode: 'WD', name: "Women's Doubles", pairingType: 'doubles' },
        { categoryCode: 'XD', name: 'Mixed Doubles', pairingType: 'mixed_doubles' },
    ];

    assert.deepEqual(categories, categoriesExpected.map((category, index) => ({ id: index + 1, ...category })));
    assert.deepEqual(calls.map(({ where }) => where.name), categoriesExpected.map(({ name }) => name));
    assert.ok(calls.every(({ create, update }) => (
        create.name.length > 0 && create.categoryCode.length > 0 && create.pairingType.length > 0
            && update.categoryCode === create.categoryCode && update.pairingType === create.pairingType
    )));
});

test('refuses production seeding', async () => {
    let transactionStarted = false;
    const database = {
        $transaction: async () => {
            transactionStarted = true;
        },
    };

    await assert.rejects(
        seedPlayerCategories(database, { NODE_ENV: 'production' }),
        /cannot be seeded in production/,
    );
    assert.equal(transactionStarted, false);
});
