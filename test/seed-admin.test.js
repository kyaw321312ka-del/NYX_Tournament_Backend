const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const seedAdmin = require('../prisma/seedings/seed-admin');

test('admin seed requires explicit credentials before using the database', async () => {
    let transactionStarted = false;
    const database = {
        $transaction: async () => {
            transactionStarted = true;
        },
    };

    await assert.rejects(seedAdmin(database, {}), /ADMIN_EMAIL/);
    assert.equal(transactionStarted, false);
});

test('admin seed creates a verified admin with a bcrypt password hash', async () => {
    let createdData;
    const database = {
        $transaction: async (callback) => callback({
            role: {
                upsert: async () => ({ id: 7 }),
            },
            user: {
                findUnique: async () => null,
                create: async ({ data }) => {
                    createdData = data;
                    return {
                        id: 12,
                        name: data.name,
                        email: data.email,
                        role: { name: 'admin' },
                    };
                },
            },
        }),
    };

    const result = await seedAdmin(database, {
        ADMIN_EMAIL: 'ADMIN@example.com',
        ADMIN_PASSWORD: 'a-long-test-password',
    });

    assert.equal(result.created, true);
    assert.equal(createdData.email, 'admin@example.com');
    assert.equal(createdData.roleId, 7);
    assert.ok(createdData.emailVerifiedAt instanceof Date);
    assert.equal(await bcrypt.compare('a-long-test-password', createdData.passwordHash), true);
});

test('admin seed is idempotent and refuses to promote an existing user', async () => {
    const existing = {
        id: 1,
        email: 'admin@example.com',
        role: { name: 'admin' },
    };
    const database = {
        $transaction: async (callback) => callback({
            role: { upsert: async () => ({ id: 1 }) },
            user: {
                findUnique: async () => existing,
                create: async () => assert.fail('Existing account must not be recreated'),
            },
        }),
    };

    const result = await seedAdmin(database, {
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'a-long-test-password',
    });
    assert.deepEqual(result, { created: false, user: existing });

    const regularUserDatabase = {
        $transaction: async (callback) => callback({
            role: { upsert: async () => ({ id: 1 }) },
            user: {
                findUnique: async () => ({ ...existing, role: { name: 'user' } }),
                create: async () => assert.fail('Existing account must not be promoted'),
            },
        }),
    };
    await assert.rejects(
        seedAdmin(regularUserDatabase, {
            ADMIN_EMAIL: 'admin@example.com',
            ADMIN_PASSWORD: 'a-long-test-password',
        }),
        /non-admin account/,
    );
});
