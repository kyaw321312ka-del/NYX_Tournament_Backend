const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('./authSchemas');

test('registration normalizes email and trims name and phone', () => {
  const result = schemas.register.safeParse({
    name: '  Tournament Player ',
    gender: 'Female',
    phno: '  +1 555 123 4567 ',
    email: ' PLAYER@example.com ',
    password: 'correct horse battery staple',
    categoryIds: ['1', '3'],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    name: 'Tournament Player',
    gender: 'female',
    phno: '+1 555 123 4567',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: [1, 3],
  });
});

test('registration requires binary gender values', () => {
  const base = {
    name: 'Player',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: ['1'],
  };
  for (const gender of ['Male', 'Female']) {
    assert.equal(schemas.register.safeParse({ ...base, gender }).success, true);
  }
  for (const gender of ['Non-binary', 'Prefer not to say', 'unknown']) {
    assert.equal(schemas.register.safeParse({ ...base, gender }).success, false);
  }
  assert.equal(schemas.register.safeParse(base).success, false);
  assert.equal(schemas.register.safeParse({ ...base, gender: null }).success, false);
});

test('registration rejects passwords that bcrypt would truncate', () => {
  const result = schemas.register.safeParse({
    name: 'Player',
    gender: 'female',
    email: 'player@example.com',
    password: 'é'.repeat(37),
    categoryIds: ['1'],
  });

  assert.equal(result.success, false);
});

test('registration requires at least one valid player category', () => {
  assert.equal(schemas.register.safeParse({
    name: 'Player',
    gender: 'female',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: ['1'],
  }).success, true);

  assert.equal(schemas.register.safeParse({
    name: 'Player',
    gender: 'female',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: [],
  }).success, false);

  assert.equal(schemas.register.safeParse({
    name: 'Player',
    gender: 'female',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: ['not-a-category'],
  }).success, false);
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
