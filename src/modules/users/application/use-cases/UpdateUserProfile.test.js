const test = require('node:test');
const assert = require('node:assert/strict');
const UpdateUserProfile = require('./UpdateUserProfile');

function createUseCase({ existingEmail = 'old@example.com', emailOwner = null } = {}) {
    const calls = [];
    const existing = {
        id: 7,
        email: existingEmail,
        passwordHash: 'old-hash',
    };
    const user = {
        id: 7,
        name: 'Updated Player',
        gender: 'male',
        birthday: null,
        email: existingEmail,
        phno: null,
        profileImageUrl: null,
        role: { name: 'user' },
        emailVerifiedAt: new Date(),
        createdAt: new Date(),
    };
    const userRepository = {
        findProfileForUpdate: async () => existing,
        findUserByEmail: async () => emailOwner,
        updateProfile: async (userId, data, emailChange, categoryIds) => {
            calls.push(['updateProfile', userId, data, emailChange, categoryIds]);
            return {
                user: { ...user, ...data, role: user.role },
                previousFiles: {
                    profileImageUrl: data.profileImageUrl ? '/old-profile.png' : null,
                    frontIdImg: data.frontIdImg ? 'old-front.jpg' : null,
                    backIdImg: data.backIdImg ? 'old-back.jpg' : null,
                },
            };
        },
    };
    const passwordHasher = {
        verify: async (password, hash) => {
            calls.push(['verify', password, hash]);
            return password === 'current-password';
        },
        hash: async (password) => `hashed:${password}`,
    };
    const otpService = {
        create: () => ({
            code: '123456',
            hash: 'otp-hash',
            expiresAt: new Date(Date.now() + 600000),
        }),
    };
    const emailOtpSender = {
        sendEmailChangeOtp: async (email, code) => calls.push(['sendOtp', email, code]),
    };
    const profileImageStorage = {
        save: async (buffer) => `/uploads/player-profiles/${buffer.toString()}`,
        remove: async (file) => calls.push(['removeProfileImage', file]),
    };
    const identityDocumentStorage = {
        save: async (buffer) => `${buffer.toString()}.jpg`,
        remove: async (file) => calls.push(['removeIdentityDocument', file]),
    };

    return {
        useCase: new UpdateUserProfile({
            userRepository,
            passwordHasher,
            otpService,
            emailOtpSender,
            profileImageStorage,
            identityDocumentStorage,
        }),
        calls,
    };
}

test('updates profile fields without requiring a password confirmation', async () => {
    const { useCase, calls } = createUseCase();

    const result = await useCase.execute(7, { name: 'Updated Player', phno: null });

    assert.equal(result.user.name, 'Updated Player');
    assert.equal(result.emailVerificationRequired, false);
    assert.deepEqual(calls, [
        ['updateProfile', 7, {
            name: 'Updated Player',
            gender: undefined,
            birthday: undefined,
            phno: null,
            passwordHash: undefined,
        }, undefined, undefined],
    ]);
});

test('updates the birthday as a date-only value', async () => {
    const { useCase, calls } = createUseCase();

    const result = await useCase.execute(7, { birthday: '1995-08-12' });

    assert.equal(result.user.birthday, '1995-08-12');
    assert.equal(calls[0][2].birthday.toISOString(), '1995-08-12T00:00:00.000Z');
});

test('updates categories and all submitted profile image files', async () => {
    const { useCase, calls } = createUseCase();

    await useCase.execute(7, { categoryIds: [1, 2] }, {
        profileImage: [{ buffer: Buffer.from('new-profile') }],
        frontIdImg: [{ buffer: Buffer.from('new-front') }],
        backIdImg: [{ buffer: Buffer.from('new-back') }],
    });

    const updateCall = calls.find(([type]) => type === 'updateProfile');
    assert.equal(updateCall[2].profileImageUrl, '/uploads/player-profiles/new-profile');
    assert.equal(updateCall[2].frontIdImg, 'new-front.jpg');
    assert.equal(updateCall[2].backIdImg, 'new-back.jpg');
    assert.deepEqual(updateCall[4], [1, 2]);
    assert.deepEqual(
        calls.filter(([type]) => type === 'removeIdentityDocument').map(([, file]) => file),
        ['old-front.jpg', 'old-back.jpg'],
    );
    assert.deepEqual(
        calls.filter(([type]) => type === 'removeProfileImage').map(([, file]) => file),
        ['/old-profile.png'],
    );
});

test('requires the current password and hashes a new password', async () => {
    const { useCase, calls } = createUseCase();

    await assert.rejects(
        useCase.execute(7, { password: 'new-password', currentPassword: 'wrong-password' }),
        /Current password is incorrect/,
    );
    assert.equal(calls.some(([type]) => type === 'updateProfile'), false);

    const result = await useCase.execute(7, {
        password: 'new-password',
        currentPassword: 'current-password',
    });

    assert.equal(result.emailVerificationRequired, false);
    assert.equal(calls.at(-1)[2].passwordHash, 'hashed:new-password');
});

test('sends an OTP before changing the email address', async () => {
    const { useCase, calls } = createUseCase();

    const result = await useCase.execute(7, {
        email: 'new@example.com',
        currentPassword: 'current-password',
    });

    assert.equal(result.user.email, 'old@example.com');
    assert.equal(result.emailVerificationRequired, true);
    assert.equal(result.pendingEmail, 'new@example.com');
    assert.equal(calls[1][3].newEmail, 'new@example.com');
    assert.deepEqual(calls[2], ['sendOtp', 'new@example.com', '123456']);
});

test('rejects an email already owned by another user', async () => {
    const { useCase, calls } = createUseCase({ emailOwner: { id: 9 } });

    await assert.rejects(
        useCase.execute(7, {
            email: 'taken@example.com',
            currentPassword: 'current-password',
        }),
        /already exists/,
    );
    assert.equal(calls.some(([type]) => type === 'updateProfile'), false);
});
