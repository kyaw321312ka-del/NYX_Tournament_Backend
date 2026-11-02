const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const seedTestUsers = require('../prisma/seedings/seed-test-users');

function createDatabase({ existingUsers = [] } = {}) {
    const calls = {
        transactions: 0,
        creates: [],
        lookups: [],
    };
    const existingByEmail = new Map(existingUsers.map((user) => [user.email, user]));
    const database = {
        $transaction: async (callback) => {
            calls.transactions += 1;
            return callback({
                role: {
                    upsert: async () => ({ id: 2 }),
                },
                user: {
                    findUnique: async ({ where }) => {
                        calls.lookups.push(where.email);
                        return existingByEmail.get(where.email) ?? null;
                    },
                    create: async ({ data }) => {
                        calls.creates.push(data);
                        const user = {
                            id: calls.creates.length,
                            name: data.name,
                            email: data.email,
                            role: { name: 'user' },
                        };
                        existingByEmail.set(data.email, user);
                        return user;
                    },
                },
            });
        },
    };

    return { database, calls };
}

test('test-user seed requires an explicit strong password before using the database', async () => {
    const { database, calls } = createDatabase();

    await assert.rejects(seedTestUsers(database, {}), /TEST_USERS_PASSWORD/);
    await assert.rejects(
        seedTestUsers(database, { TEST_USERS_PASSWORD: 'short' }),
        /TEST_USERS_PASSWORD/,
    );
    assert.equal(calls.transactions, 0);
});

test('test-user seed refuses production before using the database', async () => {
    const { database, calls } = createDatabase();

    await assert.rejects(
        seedTestUsers(database, {
            NODE_ENV: 'production',
            TEST_USERS_PASSWORD: 'a-strong-test-password',
        }),
        /cannot be seeded in production/,
    );
    assert.equal(calls.transactions, 0);
});

test('creates the three verified player accounts with a bcrypt password hash', async () => {
    const { database, calls } = createDatabase();
    const results = await seedTestUsers(database, {
        TEST_USERS_PASSWORD: 'a-strong-test-password',
    });

    assert.deepEqual(results.map(({ user }) => user.email), [
        'godnear259@gmail.com',
        'kyaw321312ka@gmail.com',
        'kl2578233@gmail.com',
    ]);
    assert.ok(results.every(({ created }) => created));
    assert.equal(calls.creates.length, 3);
    assert.ok(calls.creates.every(({ roleId, emailVerifiedAt }) => (
        roleId === 2 && emailVerifiedAt instanceof Date
    )));
    assert.equal(
        await bcrypt.compare('a-strong-test-password', calls.creates[0].passwordHash),
        true,
    );
});

test('leaves existing accounts unchanged and can be safely rerun', async () => {
    const existingUser = {
        id: 42,
        name: 'Existing account',
        email: 'godnear259@gmail.com',
        role: { name: 'admin' },
    };
    const { database, calls } = createDatabase({ existingUsers: [existingUser] });
    const options = { TEST_USERS_PASSWORD: 'a-strong-test-password' };

    const firstRun = await seedTestUsers(database, options);
    const secondRun = await seedTestUsers(database, options);

    assert.equal(firstRun[0].created, false);
    assert.deepEqual(firstRun[0].user, existingUser);
    assert.ok(firstRun.slice(1).every(({ created }) => created));
    assert.ok(secondRun.every(({ created }) => !created));
    assert.equal(calls.creates.length, 2);
});
