const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createPaymentMethodSchema,
    updatePaymentMethodSchema,
    setPaymentMethodStatusSchema,
} = require('./paymentMethodSchemas');

const validMethod = {
    paymentMethodName: ' K Pay ',
    accountName: ' NYX Tournament ',
    accountNumber: ' 09XXXXXXXXX ',
};

test('validates and normalizes payment method details', () => {
    assert.deepEqual(createPaymentMethodSchema.parse(validMethod), {
        paymentMethodName: 'K Pay',
        accountName: 'NYX Tournament',
        accountNumber: '09XXXXXXXXX',
    });
});

test('requires a value to update and validates activation state', () => {
    assert.equal(updatePaymentMethodSchema.safeParse({}).success, false);
    assert.deepEqual(updatePaymentMethodSchema.parse({ accountNumber: '09YYYYYYYYY' }), {
        accountNumber: '09YYYYYYYYY',
    });
    assert.equal(setPaymentMethodStatusSchema.safeParse({ isActive: false }).success, true);
    assert.equal(setPaymentMethodStatusSchema.safeParse({ isActive: 'false' }).success, false);
});
