const test = require('node:test');
const assert = require('node:assert/strict');
const {
    submitPaymentSchema,
    listPaymentHistorySchema,
    rejectPaymentSchema,
} = require('./paymentSchemas');

test('payment submission requires a method and normalizes its optional transaction reference', () => {
    assert.deepEqual(submitPaymentSchema.parse({
        paymentMethodId: '4',
        transactionReference: '  TX-123  ',
    }), {
        paymentMethodId: 4,
        transactionReference: 'TX-123',
    });
    assert.deepEqual(submitPaymentSchema.parse({ paymentMethodId: 4 }), {
        paymentMethodId: 4,
        transactionReference: null,
    });
    assert.equal(submitPaymentSchema.safeParse({}).success, false);
});

test('payment history paging has defaults', () => {
    assert.deepEqual(listPaymentHistorySchema.parse({}), { page: 1, pageSize: 20 });
    assert.equal(listPaymentHistorySchema.safeParse({ page: 0 }).success, false);
});

test('payment rejection requires a non-empty reason', () => {
    assert.equal(rejectPaymentSchema.safeParse({ rejectionReason: 'Amount is incorrect.' }).success, true);
    assert.equal(rejectPaymentSchema.safeParse({ rejectionReason: ' ' }).success, false);
});
