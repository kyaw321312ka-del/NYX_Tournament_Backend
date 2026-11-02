const test = require('node:test');
const assert = require('node:assert/strict');
const { createPartnerInvitationSchema } = require('./registrationSchemas');

test('partner invitation input normalizes email casing', () => {
    const result = createPartnerInvitationSchema.safeParse({
        tournamentCategoryId: '5',
        partnerEmail: '  PARTNER@example.com ',
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.data, {
        tournamentCategoryId: 5,
        partnerEmail: 'partner@example.com',
    });
});

test('partner invitation input rejects invalid email addresses', () => {
    const result = createPartnerInvitationSchema.safeParse({
        tournamentCategoryId: 5,
        partnerEmail: 'not-an-email',
    });

    assert.equal(result.success, false);
});
