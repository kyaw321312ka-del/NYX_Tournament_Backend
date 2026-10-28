const test = require('node:test');
const assert = require('node:assert/strict');
const LoginUser = require('./LoginUser');

const verifiedUser = {
  id: 7,
  roleId: 2,
  name: 'Player',
  email: 'player@example.com',
  phno: null,
  passwordHash: 'stored-hash',
  emailVerifiedAt: new Date(),
  createdAt: new Date(),
  role: { name: 'user' },
};

test('login returns a token and safe user profile for verified credentials', async () => {
  const useCase = new LoginUser({
    authRepository: { findUserByEmail: async () => verifiedUser },
    passwordHasher: { verify: async () => true },
    tokenService: { issue: () => 'access-token' },
  });

  const result = await useCase.execute({
    email: ' PLAYER@example.com ',
    password: 'correct-password',
  });

  assert.equal(result.token, 'access-token');
  assert.equal(result.user.email, 'player@example.com');
  assert.equal('passwordHash' in result.user, false);
});

test('login refuses unverified accounts', async () => {
  const useCase = new LoginUser({
    authRepository: {
      findUserByEmail: async () => ({ ...verifiedUser, emailVerifiedAt: null }),
    },
    passwordHasher: { verify: async () => true },
    tokenService: { issue: () => 'unused' },
  });

  await assert.rejects(
    useCase.execute({ email: verifiedUser.email, password: 'correct-password' }),
    { statusCode: 403, message: 'Verify your email before signing in.' },
  );
});
