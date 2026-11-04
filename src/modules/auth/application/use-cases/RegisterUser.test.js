const test = require('node:test');
const assert = require('node:assert/strict');
const RegisterUser = require('./RegisterUser');

function createRegisterUser({
  existingUser = null,
  previousPending = null,
  savePendingError = null,
  emailError = null,
} = {}) {
  const calls = [];
  const authRepository = {
    findUserByEmail: async (email) => {
      calls.push(['findUserByEmail', email]);
      return existingUser;
    },
    findCategoriesByIds: async (ids) => {
      calls.push(['findCategoriesByIds', ids]);
      return ids.map((id) => ({ id, name: `Category ${id}` }));
    },
    findPendingRegistration: async (email) => {
      calls.push(['findPendingRegistration', email]);
      return previousPending;
    },
    savePendingRegistration: async (data) => {
      calls.push(['savePendingRegistration', data]);
      if (savePendingError) throw savePendingError;
    },
  };
  const useCase = new RegisterUser({
    authRepository,
    passwordHasher: {
      hash: async (password) => {
        calls.push(['hashPassword', password]);
        return 'password-hash';
      },
    },
    otpService: {
      create: () => ({ code: '123456', hash: 'otp-hash', expiresAt: new Date('2027-01-01T00:00:00Z') }),
    },
    emailOtpSender: {
      sendVerificationOtp: async (email, code) => {
        calls.push(['sendOtp', email, code]);
        if (emailError) throw emailError;
      },
    },
    profileImageStorage: {
      save: async (buffer) => {
        calls.push(['saveProfileImage', buffer.toString()]);
        return '/uploads/player-profiles/new.png';
      },
      remove: async (url) => calls.push(['removeProfileImage', url]),
    },
    identityDocumentStorage: {
      save: async (buffer) => {
        calls.push(['saveIdentityDocument', buffer.toString()]);
        return `${buffer.toString()}.jpg`;
      },
      remove: async (filename) => calls.push(['removeIdentityDocument', filename]),
    },
  });

  return { useCase, calls };
}

const input = {
  name: '  Test Player  ',
  phno: '+959123456789',
  email: ' PLAYER@example.com ',
  password: 'a-strong-password',
  categoryIds: [1, 2],
};
const files = {
  profileImage: [{ buffer: Buffer.from('profile') }],
  frontIdImg: [{ buffer: Buffer.from('front') }],
  backIdImg: [{ buffer: Buffer.from('back') }],
};

test('requires both ID document images and does not create pending registration without them', async () => {
  const { useCase, calls } = createRegisterUser();

  await assert.rejects(useCase.execute(input, {}), {
    statusCode: 400,
    message: 'Upload both frontIdImg and backIdImg files.',
  });
  assert.equal(calls.some(([action]) => action === 'savePendingRegistration'), false);
});

test('stores uploaded image references with pending registration before OTP verification', async () => {
  const { useCase, calls } = createRegisterUser();

  const result = await useCase.execute(input, files);
  const pending = calls.find(([action]) => action === 'savePendingRegistration')[1];

  assert.equal(result.email, 'player@example.com');
  assert.equal(pending.name, 'Test Player');
  assert.equal(pending.email, 'player@example.com');
  assert.equal(pending.profileImageUrl, '/uploads/player-profiles/new.png');
  assert.equal(pending.frontIdImg, 'front.jpg');
  assert.equal(pending.backIdImg, 'back.jpg');
  assert.deepEqual(pending.categoryIds, [1, 2]);
  assert.equal(pending.passwordHash, 'password-hash');
  assert.equal(calls.some(([action]) => action === 'sendOtp'), true);
});

test('rejects invalid category selections before saving uploaded images', async () => {
  const { useCase, calls } = createRegisterUser();
  useCase.authRepository.findCategoriesByIds = async () => [];

  await assert.rejects(useCase.execute(input, files), {
    statusCode: 400,
    message: 'One or more selected player categories are invalid.',
  });
  assert.equal(calls.some(([action]) => action === 'saveProfileImage'), false);
  assert.equal(calls.some(([action]) => action === 'saveIdentityDocument'), false);
});

test('keeps the previous pending files until new files are saved, then removes replaced files', async () => {
  const { useCase, calls } = createRegisterUser({
    previousPending: {
      profileImageUrl: '/uploads/player-profiles/old.png',
      frontIdImg: 'old-front.jpg',
      backIdImg: 'old-back.jpg',
    },
  });

  await useCase.execute(input, files);

  const saveIndex = calls.findIndex(([action]) => action === 'savePendingRegistration');
  const removalIndex = calls.findIndex(([action]) => action === 'removeProfileImage');
  assert.ok(removalIndex > saveIndex);
  assert.deepEqual(
    calls.filter(([action]) => action === 'removeIdentityDocument').map(([, filename]) => filename),
    ['old-front.jpg', 'old-back.jpg'],
  );
});

test('cleans new uploads when saving the pending registration fails', async () => {
  const { useCase, calls } = createRegisterUser({
    savePendingError: new Error('Database unavailable'),
  });

  await assert.rejects(useCase.execute(input, files), /Database unavailable/);
  assert.equal(calls.some(([action]) => action === 'removeProfileImage'), true);
  assert.deepEqual(
    calls.filter(([action]) => action === 'removeIdentityDocument').map(([, filename]) => filename),
    ['front.jpg', 'back.jpg'],
  );
});

test('does not remove files referenced by pending registration if email delivery fails', async () => {
  const { useCase, calls } = createRegisterUser({
    emailError: new Error('SMTP unavailable'),
  });

  await assert.rejects(useCase.execute(input, files), /SMTP unavailable/);
  assert.equal(calls.some(([action]) => action === 'savePendingRegistration'), true);
  assert.equal(calls.some(([action]) => action === 'removeProfileImage'), false);
});

test('rejects duplicate accounts before storing uploaded files', async () => {
  const { useCase, calls } = createRegisterUser({ existingUser: { id: 1 } });

  await assert.rejects(useCase.execute(input, files), { statusCode: 409 });
  assert.equal(calls.some(([action]) => action === 'saveProfileImage'), false);
  assert.equal(calls.some(([action]) => action === 'saveIdentityDocument'), false);
});
