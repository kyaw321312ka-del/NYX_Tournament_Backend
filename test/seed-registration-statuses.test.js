const test = require('node:test');
const assert = require('node:assert/strict');
const seedRegistrationStatuses = require('../prisma/seedings/seed-registration-statuses');

test('registration status seed upserts all supported statuses', async () => {
    const upsertCalls = [];
    const database = {
        tournamentRegistrationStatus: {
            upsert: async (args) => {
                upsertCalls.push(args);
                return { id: upsertCalls.length, name: args.where.name };
            },
        },
    };

    const statuses = await seedRegistrationStatuses(database);

    const names = ['pending', 'confirmed', 'rejected', 'cancelled', 'waitlisted'];
    assert.deepEqual(statuses.map(({ name }) => name), names);
    assert.deepEqual(
        upsertCalls.map(({ where }) => where.name),
        names,
    );
    assert.ok(upsertCalls.every(({ where, create, update }) => (
        create.name === where.name && Object.keys(update).length === 0
    )));
});
