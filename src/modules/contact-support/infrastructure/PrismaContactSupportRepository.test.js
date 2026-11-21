const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaContactSupportRepository = require('./PrismaContactSupportRepository');

const contactSupport = {
    phone: '+95 9 123 456 789',
    website: 'www.nyxbadminton.com',
    email: 'support@nyxbadminton.com',
    address: '73 rd St, Between 102nd & 103rd, Chanmyathazi, Mandalay',
};

test('reads the singleton contact and support record', async () => {
    const repository = new PrismaContactSupportRepository({
        contactSupport: {
            findUnique: async ({ where }) => {
                assert.deepEqual(where, { id: 1 });
                return { id: 1, ...contactSupport };
            },
        },
    });

    assert.deepEqual(await repository.get(), { id: 1, ...contactSupport });
});

test('returns not found when the singleton has been deleted', async () => {
    const repository = new PrismaContactSupportRepository({
        contactSupport: { findUnique: async () => null },
    });

    await assert.rejects(repository.get(), { statusCode: 404 });
    await assert.rejects(repository.remove(), { statusCode: 404 });
});

test('creates the singleton once and rejects duplicates', async () => {
    let existing = null;
    const repository = new PrismaContactSupportRepository({
        contactSupport: {
            findUnique: async () => existing,
            create: async ({ data }) => {
                existing = data;
                return data;
            },
        },
    });

    assert.deepEqual(await repository.create(contactSupport), { id: 1, ...contactSupport });
    await assert.rejects(repository.create(contactSupport), { statusCode: 409 });
});

test('updates or creates the singleton and deletes it', async () => {
    let existing = null;
    let deleted = false;
    const repository = new PrismaContactSupportRepository({
        contactSupport: {
            upsert: async ({ where, create, update }) => {
                assert.deepEqual(where, { id: 1 });
                existing = existing ? { ...existing, ...update } : create;
                return existing;
            },
            findUnique: async () => existing,
            delete: async ({ where }) => {
                assert.deepEqual(where, { id: 1 });
                deleted = true;
                existing = null;
            },
        },
    });

    const created = await repository.update(contactSupport);
    assert.deepEqual(created, { id: 1, ...contactSupport });
    assert.deepEqual(await repository.update({ ...contactSupport, phone: '+95 9 999 000 111' }), {
        id: 1,
        ...contactSupport,
        phone: '+95 9 999 000 111',
    });
    await repository.remove();
    assert.equal(deleted, true);
});
