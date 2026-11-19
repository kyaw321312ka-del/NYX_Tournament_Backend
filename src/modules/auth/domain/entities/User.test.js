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

test('public profile includes the club name', () => {
  const user = User.fromRecord({
    id: 1,
    name: 'Player',
    clubName: 'Yangon Badminton Club',
    gender: 'female',
    email: 'player@example.com',
    role: { name: 'user' },
  });

  assert.equal(user.toPublicProfile().clubName, 'Yangon Badminton Club');
});

test('public profile reads player details from the profile relation', () => {
  const user = User.fromRecord({
    id: 1,
    name: 'Player',
    email: 'player@example.com',
    phno: null,
    profile: {
      gender: 'female',
      birthday: new Date('1995-08-12T00:00:00.000Z'),
      clubName: 'Yangon Badminton Club',
      address: 'Yangon',
      profileImageUrl: '/uploads/player-profiles/player.png',
    },
    role: { name: 'user' },
  });

  assert.equal(user.toPublicProfile().gender, 'female');
  assert.equal(user.toPublicProfile().birthday, '1995-08-12');
  assert.equal(user.toPublicProfile().clubName, 'Yangon Badminton Club');
  assert.equal(user.toPublicProfile().address, 'Yangon');
  assert.equal(user.toPublicProfile().profileImageUrl, '/uploads/player-profiles/player.png');
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
