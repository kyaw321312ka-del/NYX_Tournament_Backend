const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaAuthRepository = require('./PrismaAuthRepository');

test('email verification transfers pending image references to the new user', async () => {
  const calls = [];
  const pending = {
    id: 12,
    name: 'Test Player',
    phno: '+959123456789',
    email: 'player@example.com',
    passwordHash: 'password-hash',
    profileImageUrl: '/uploads/player-profiles/profile.png',
    frontIdImg: 'front.jpg',
    backIdImg: 'back.jpg',
  };
  const prisma = {
    $transaction: async (callback) => callback({
      role: {
        upsert: async () => ({ id: 2 }),
      },
      user: {
        create: async ({ data }) => {
          calls.push(['create', data]);
          return { ...data, id: 8, role: { name: 'user' } };
        },
      },
      pendingRegistration: {
        deleteMany: async (args) => {
          calls.push(['deletePending', args]);
          return { count: 1 };
        },
      },
    }),
  };
  const repository = new PrismaAuthRepository(prisma);

  const user = await repository.completePendingRegistration(pending);

  assert.equal(user.profileImageUrl, pending.profileImageUrl);
  assert.equal(user.frontIdImg, pending.frontIdImg);
  assert.equal(user.backIdImg, pending.backIdImg);
  assert.deepEqual(calls[0][1], {
    roleId: 2,
    name: pending.name,
    phno: pending.phno,
    email: pending.email,
    passwordHash: pending.passwordHash,
    emailVerifiedAt: calls[0][1].emailVerifiedAt,
    profileImageUrl: pending.profileImageUrl,
    frontIdImg: pending.frontIdImg,
    backIdImg: pending.backIdImg,
  });
  assert.ok(calls[0][1].emailVerifiedAt instanceof Date);
  assert.deepEqual(calls[1][1], { where: { id: pending.id, attempts: { lt: 5 } } });
});
