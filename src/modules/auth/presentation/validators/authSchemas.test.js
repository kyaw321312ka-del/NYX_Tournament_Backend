const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('./authSchemas');

test('registration normalizes email and trims name and phone', () => {
  const result = schemas.register.safeParse({
    name: '  Tournament Player ',
    phno: '  +1 555 123 4567 ',
    email: ' PLAYER@example.com ',
    password: 'correct horse battery staple',
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    name: 'Tournament Player',
    phno: '+1 555 123 4567',
    email: 'player@example.com',
    password: 'correct horse battery staple',
  });
});

test('registration rejects passwords that bcrypt would truncate', () => {
  const result = schemas.register.safeParse({
    name: 'Player',
    email: 'player@example.com',
    password: 'é'.repeat(37),
  });

  assert.equal(result.success, false);
});

test('email verification accepts only six-digit codes', () => {
  assert.equal(schemas.verifyEmail.safeParse({
    email: 'player@example.com',
    otp: '123456',
  }).success, true);
  assert.equal(schemas.verifyEmail.safeParse({
    email: 'player@example.com',
    otp: '12345x',
  }).success, false);
});
