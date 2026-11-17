const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('./authSchemas');

test('registration normalizes email and trims name and phone', () => {
  const result = schemas.register.safeParse({
    name: '  Tournament Player ',
    gender: 'Female',
    phno: '  +1 555 123 4567 ',
    birthday: '1995-08-12',
    email: ' PLAYER@example.com ',
    password: 'correct horse battery staple',
    categoryIds: ['1', '3'],
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    name: 'Tournament Player',
    gender: 'female',
    birthday: '1995-08-12',
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
    birthday: '1990-01-01',
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
    birthday: '1990-01-01',
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
    birthday: '1990-01-01',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: ['1'],
  }).success, true);

  assert.equal(schemas.register.safeParse({
    name: 'Player',
    gender: 'female',
    birthday: '1990-01-01',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: [],
  }).success, false);

  assert.equal(schemas.register.safeParse({
    name: 'Player',
    gender: 'female',
    birthday: '1990-01-01',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: ['not-a-category'],
  }).success, false);
});

test('registration requires a valid birthday that is not in the future', () => {
  const base = {
    name: 'Player',
    gender: 'female',
    email: 'player@example.com',
    password: 'correct horse battery staple',
    categoryIds: ['1'],
  };
  assert.equal(schemas.register.safeParse({ ...base, birthday: '1995-08-12' }).success, true);
  assert.equal(schemas.register.safeParse({ ...base, birthday: 'not-a-date' }).success, false);
  assert.equal(schemas.register.safeParse({ ...base, birthday: '2995-08-12' }).success, false);
  assert.equal(schemas.register.safeParse(base).success, false);
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
