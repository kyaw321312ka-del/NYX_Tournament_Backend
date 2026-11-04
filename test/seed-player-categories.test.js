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
                    return { id: calls.length, name: args.where.name };
                },
            },
        }),
    };

    const categories = await seedPlayerCategories(database, {});
    const names = [
        "Men's Singles",
        "Women's Singles",
        "Men's Doubles",
        "Women's Doubles",
        'Mixed Doubles',
    ];

    assert.deepEqual(categories.map(({ name }) => name), names);
    assert.deepEqual(calls.map(({ where }) => where.name), names);
    assert.ok(calls.every(({ create, update }) => (
        create.name.length > 0 && Object.keys(update).length === 0
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
