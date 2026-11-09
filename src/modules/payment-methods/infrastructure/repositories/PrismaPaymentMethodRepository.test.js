const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaPaymentMethodRepository = require('./PrismaPaymentMethodRepository');

const record = {
    id: 4,
    paymentMethodName: 'K Pay',
    accountName: 'NYX Tournament',
    accountNumber: '09XXXXXXXXX',
    isActive: true,
    createdAt: new Date('2026-11-09T00:00:00Z'),
    updatedAt: new Date('2026-11-09T00:00:00Z'),
};

test('lists active payment methods only for player requests', async () => {
    let args;
    const repository = new PrismaPaymentMethodRepository({
        paymentMethod: {
            findMany: async (input) => {
                args = input;
                return [record];
            },
        },
    });

    const methods = await repository.list({ activeOnly: true });

    assert.deepEqual(args.where, { isActive: true });
    assert.equal(methods.length, 1);
    assert.equal(methods[0].toJSON().accountNumber, '09XXXXXXXXX');
});

test('does not delete methods and exposes deactivation as an update', async () => {
    const calls = [];
    const repository = new PrismaPaymentMethodRepository({
        paymentMethod: {
            updateMany: async (args) => {
                calls.push(args);
                return { count: 1 };
            },
            findUnique: async () => ({ ...record, isActive: false }),
        },
    });

    const method = await repository.setStatus(4, false);

    assert.deepEqual(calls, [{ where: { id: 4 }, data: { isActive: false } }]);
    assert.equal(method.isActive, false);
});
