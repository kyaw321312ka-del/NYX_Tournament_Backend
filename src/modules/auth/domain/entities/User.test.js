const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('./User');

test('public profile serializes birthday as a date-only value', () => {
  const user = User.fromRecord({
    id: 1,
    name: 'Player',
    gender: 'female',
    birthday: new Date('1995-08-12T00:00:00.000Z'),
    email: 'player@example.com',
    role: { name: 'user' },
  });

  assert.equal(user.toPublicProfile().birthday, '1995-08-12');
});

test('public profile leaves legacy birthdays empty', () => {
  const user = User.fromRecord({
    id: 1,
    name: 'Player',
    gender: 'female',
    birthday: null,
    email: 'player@example.com',
    role: { name: 'user' },
  });

  assert.equal(user.toPublicProfile().birthday, null);
});
