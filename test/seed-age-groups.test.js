const test = require('node:test');
const assert = require('node:assert/strict');
const {
    AGE_GROUPS,
    seedAgeGroups,
} = require('../prisma/seedings/seed-age-groups');

function createDatabase() {
    const calls = [];
    const existing = new Map();
    const database = {
        $transaction: async (callback) => callback({
            ageGroup: {
                upsert: async (args) => {
                    calls.push(args);
                    const key = `${args.create.name}:${args.create.age}`;
                    const group = existing.get(key) ?? {
                        id: existing.size + 1,
                        ...args.create,
                    };
                    existing.set(key, group);
                    return group;
                },
            },
        }),
    };
    return { database, calls, existing };
}

test('generates U10 through U20 with matching maximum ages', () => {
    assert.deepEqual(
        AGE_GROUPS,
        Array.from({ length: 11 }, (_, index) => ({
            name: `U${index + 10}`,
            age: index + 10,
        })),
    );
});

test('seeds all age groups and is safe to rerun', async () => {
    const { database, calls } = createDatabase();

    const firstRun = await seedAgeGroups(database, { NODE_ENV: 'development' });
    const secondRun = await seedAgeGroups(database, { NODE_ENV: 'development' });

    assert.equal(firstRun.length, 11);
    assert.equal(secondRun.length, 11);
    assert.equal(calls.length, 22);
    assert.deepEqual(firstRun.map(({ name }) => name), [
        'U10', 'U11', 'U12', 'U13', 'U14', 'U15',
        'U16', 'U17', 'U18', 'U19', 'U20',
    ]);
    assert.ok(calls.every(({ create, update, where }) => (
        where.name_age.name === create.name
        && where.name_age.age === create.age
        && deepEmpty(update)
    )));
});

test('refuses production seeding before opening a transaction', async () => {
    const { database, calls } = createDatabase();

    await assert.rejects(
        seedAgeGroups(database, { NODE_ENV: 'production' }),
        /cannot be seeded in production/,
    );
    assert.equal(calls.length, 0);
});

function deepEmpty(value) {
    return value && Object.keys(value).length === 0;
}
