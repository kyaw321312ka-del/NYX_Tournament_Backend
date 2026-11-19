const test = require('node:test');
const assert = require('node:assert/strict');
const { updateProfileSchema, verifyEmailChangeSchema } = require('./userSchemas');

test('requires current password for email and password changes', () => {
    assert.equal(updateProfileSchema.safeParse({ email: 'new@example.com' }).success, false);
    assert.equal(updateProfileSchema.safeParse({ password: 'new-password' }).success, false);
    assert.equal(updateProfileSchema.safeParse({
        email: 'new@example.com',
        currentPassword: 'current-password',
    }).success, true);
});

test('normalizes email and empty phone values', () => {
    const result = updateProfileSchema.parse({
        email: ' New@Example.com ',
        phno: ' ',
        currentPassword: 'current-password',
    });
    assert.equal(result.email, 'new@example.com');
    assert.equal(result.phno, null);
});

test('accepts a club name, trims it, and allows clearing it', () => {
    assert.equal(
        updateProfileSchema.parse({ clubName: '  Yangon Badminton Club  ' }).clubName,
        'Yangon Badminton Club',
    );
    assert.equal(updateProfileSchema.parse({ clubName: '' }).clubName, null);
    assert.equal(updateProfileSchema.parse({ clubName: null }).clubName, null);
    assert.equal(updateProfileSchema.safeParse({ clubName: 'x'.repeat(151) }).success, false);
});

test('accepts, trims, and clears a profile address', () => {
    assert.equal(updateProfileSchema.parse({ address: '  Yangon  ' }).address, 'Yangon');
    assert.equal(updateProfileSchema.parse({ address: '' }).address, null);
    assert.equal(updateProfileSchema.parse({ address: null }).address, null);
    assert.equal(updateProfileSchema.safeParse({ address: 'x'.repeat(501) }).success, false);
});

test('accepts a past birthday on profile updates and rejects future birthdays', () => {
    assert.equal(updateProfileSchema.safeParse({ birthday: '1995-08-12' }).success, true);
    assert.equal(updateProfileSchema.safeParse({ birthday: '2995-08-12' }).success, false);
});

test('requires a six-digit email-change code', () => {
    assert.equal(verifyEmailChangeSchema.safeParse({ otp: '12345' }).success, false);
    assert.equal(verifyEmailChangeSchema.safeParse({ otp: '123456' }).success, true);
});
