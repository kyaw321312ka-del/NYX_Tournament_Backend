const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaAuthRepository = require('./PrismaAuthRepository');

test('email verification transfers pending image references to the new user', async () => {
  const calls = [];
  const pending = {
    id: 12,
    name: 'Test Player',
    gender: 'female',
    birthday: new Date('1995-08-12T00:00:00.000Z'),
    phno: '+959123456789',
    email: 'player@example.com',
    passwordHash: 'password-hash',
    profileImageUrl: '/uploads/player-profiles/profile.png',
    frontIdImg: 'front.jpg',
    backIdImg: 'back.jpg',
    categoryIds: [2, 4],
  };
  const prisma = {
    $transaction: async (callback) => callback({
      role: {
        upsert: async () => ({ id: 2 }),
      },
      user: {
        create: async ({ data }) => {
          calls.push(['create', data]);
          return {
            ...data,
            id: 8,
            profile: data.profile.create,
            identityDocuments: data.identityDocuments.create,
            role: { name: 'user' },
          };
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

  assert.equal(user.profile.profileImageUrl, pending.profileImageUrl);
  assert.equal(user.identityDocuments.frontImageUrl, pending.frontIdImg);
  assert.equal(user.identityDocuments.backImageUrl, pending.backIdImg);
  assert.deepEqual(calls[0][1].categories, {
    create: [
      { category: { connect: { id: 2 } } },
      { category: { connect: { id: 4 } } },
    ],
  });
  assert.deepEqual(calls[0][1], {
    roleId: 2,
    name: pending.name,
    phno: pending.phno,
    email: pending.email,
    passwordHash: pending.passwordHash,
    emailVerifiedAt: calls[0][1].emailVerifiedAt,
    profile: {
      create: {
        gender: pending.gender,
        birthday: pending.birthday,
        profileImageUrl: pending.profileImageUrl,
      },
    },
    identityDocuments: {
      create: {
        frontImageUrl: pending.frontIdImg,
        backImageUrl: pending.backIdImg,
      },
    },
    categories: {
      create: [
        { category: { connect: { id: 2 } } },
        { category: { connect: { id: 4 } } },
      ],
    },
  });
  assert.ok(calls[0][1].emailVerifiedAt instanceof Date);
  assert.deepEqual(calls[1][1], { where: { id: pending.id, attempts: { lt: 5 } } });
});
