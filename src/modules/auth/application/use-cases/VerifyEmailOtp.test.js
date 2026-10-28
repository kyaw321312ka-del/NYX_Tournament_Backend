const test = require('node:test');
const assert = require('node:assert/strict');
const VerifyEmailOtp = require('./VerifyEmailOtp');

test('email verification rejects invalid codes and increments attempts', async () => {
  let incremented = false;
  const useCase = new VerifyEmailOtp({
    authRepository: {
      findPendingRegistration: async () => ({
        id: 7,
        email: 'player@example.com',
        attempts: 0,
        otpExpiresAt: new Date(Date.now() + 60_000),
        otpHash: 'stored-hash',
      }),
      incrementPendingAttempts: async () => {
        incremented = true;
      },
    },
    otpService: { verify: () => false },
    tokenService: { issue: () => 'unused' },
  });

  await assert.rejects(
    useCase.execute({ email: 'player@example.com', otp: '123456' }),
    { statusCode: 400, message: 'The verification code is invalid.' },
  );
  assert.equal(incremented, true);
});
