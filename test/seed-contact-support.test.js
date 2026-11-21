const test = require('node:test');
const assert = require('node:assert/strict');
const {
    seedContactSupport,
    CONTACT_SUPPORT,
} = require('../prisma/seedings/seed-contact-support');

test('seeds the site-wide contact details idempotently outside production', async () => {
    const calls = [];
    const database = {
        contactSupport: {
            upsert: async (args) => {
                calls.push(args);
                return { id: 1, ...args.create };
            },
        },
    };

    const result = await seedContactSupport(database, { NODE_ENV: 'development' });

    assert.deepEqual(result, { id: 1, ...CONTACT_SUPPORT });
    assert.deepEqual(calls, [{
        where: { id: 1 },
        create: { id: 1, ...CONTACT_SUPPORT },
        update: CONTACT_SUPPORT,
    }]);
});

test('refuses to seed contact details in production', async () => {
    let writes = 0;
    await assert.rejects(seedContactSupport({
        contactSupport: {
            upsert: async () => { writes += 1; },
        },
    }, { NODE_ENV: 'production' }), /cannot be written in production/);
    assert.equal(writes, 0);
});
