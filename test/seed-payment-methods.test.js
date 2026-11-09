const test = require('node:test');
const assert = require('node:assert/strict');
const seedPaymentMethods = require('../prisma/seedings/seed-payment-methods');

test('payment method seed creates inactive demo methods and is idempotent', async () => {
    const records = [];
    const createCalls = [];
    const database = {
        paymentMethod: {
            findFirst: async ({ where }) => records.find((record) => (
                record.paymentMethodName === where.paymentMethodName
                && record.accountName === where.accountName
                && record.accountNumber === where.accountNumber
            )) ?? null,
            create: async ({ data }) => {
                createCalls.push(data);
                const record = { id: records.length + 1, ...data };
                records.push(record);
                return record;
            },
        },
    };

    const firstSeed = await seedPaymentMethods(database);
    const secondSeed = await seedPaymentMethods(database);

    assert.equal(firstSeed.length, 3);
    assert.deepEqual(secondSeed.map(({ id }) => id), firstSeed.map(({ id }) => id));
    assert.equal(createCalls.length, 3);
    assert.ok(createCalls.every(({ isActive }) => isActive === false));
    assert.deepEqual(firstSeed.map(({ paymentMethodName }) => paymentMethodName), [
        'KBZ Pay (Demo)',
        'WavePay (Demo)',
        'K Pay (Demo)',
    ]);
});
