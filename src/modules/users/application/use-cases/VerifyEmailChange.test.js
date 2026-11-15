const test = require('node:test');
const assert = require('node:assert/strict');
const VerifyEmailChange = require('./VerifyEmailChange');

function createUseCase(pending = {}) {
    const calls = [];
    const userRepository = {
        findPendingEmailChange: async () => ({
            id: 3,
            userId: 7,
            newEmail: 'new@example.com',
            otpHash: 'expected',
            otpExpiresAt: new Date(Date.now() + 600000),
            attempts: 0,
            ...pending,
        }),
        deletePendingEmailChange: async (userId) => calls.push(['delete', userId]),
        incrementPendingEmailChangeAttempts: async (id) => calls.push(['increment', id]),
        completeEmailChange: async (userId, pendingId) => {
            calls.push(['complete', userId, pendingId]);
            return {
                id: userId,
                name: 'Player',
                gender: 'female',
                email: 'new@example.com',
                role: { name: 'user' },
                emailVerifiedAt: new Date(),
                createdAt: new Date(),
            };
        },
    };
    const otpService = {
        verify: (otp, hash) => otp === '123456' && hash === 'expected',
    };
    return {
        useCase: new VerifyEmailChange({ userRepository, otpService }),
        calls,
    };
}

test('verifies a pending email change and returns the updated public profile', async () => {
    const { useCase, calls } = createUseCase();

    const user = await useCase.execute(7, { otp: '123456' });

    assert.equal(user.email, 'new@example.com');
    assert.equal(calls[0][0], 'complete');
});

test('increments attempts for an invalid OTP', async () => {
    const { useCase, calls } = createUseCase();

    await assert.rejects(useCase.execute(7, { otp: '000000' }), /code is invalid/);
    assert.deepEqual(calls, [['increment', 3]]);
});

test('deletes an expired email change request', async () => {
    const { useCase, calls } = createUseCase({
        otpExpiresAt: new Date(Date.now() - 1000),
    });

    await assert.rejects(useCase.execute(7, { otp: '123456' }), /expired/);
    assert.deepEqual(calls, [['delete', 7]]);
});
