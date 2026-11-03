const test = require('node:test');
const assert = require('node:assert/strict');
const UpdatePlayerProfileImage = require('./UpdatePlayerProfileImage');

test('stores image, updates the user, and removes the previous image', async () => {
    const calls = [];
    const useCase = new UpdatePlayerProfileImage({
        imageStorage: {
            save: async (buffer) => {
                calls.push(['save', buffer]);
                return '/uploads/player-profiles/new.png';
            },
            remove: async (url) => calls.push(['remove', url]),
        },
        userRepository: {
            updateProfileImage: async (userId, url) => {
                calls.push(['update', userId, url]);
                return {
                    user: { id: userId, profileImageUrl: url },
                    previousProfileImageUrl: '/uploads/player-profiles/old.jpg',
                };
            },
        },
    });

    const result = await useCase.execute(7, { buffer: Buffer.from('image') });

    assert.deepEqual(result, { id: 7, profileImageUrl: '/uploads/player-profiles/new.png' });
    assert.deepEqual(calls.map(([action]) => action), ['save', 'update', 'remove']);
});

test('removes the newly stored file if updating the user fails', async () => {
    const removed = [];
    const useCase = new UpdatePlayerProfileImage({
        imageStorage: {
            save: async () => '/uploads/player-profiles/new.png',
            remove: async (url) => removed.push(url),
        },
        userRepository: {
            updateProfileImage: async () => {
                throw new Error('Database unavailable');
            },
        },
    });

    await assert.rejects(
        useCase.execute(7, { buffer: Buffer.from('image') }),
        /Database unavailable/,
    );
    assert.deepEqual(removed, ['/uploads/player-profiles/new.png']);
});

test('requires a multipart profile image', async () => {
    const useCase = new UpdatePlayerProfileImage({
        imageStorage: { save: async () => assert.fail('Must not store without image') },
        userRepository: { updateProfileImage: async () => assert.fail('Must not update without image') },
    });

    await assert.rejects(
        useCase.execute(7, undefined),
        (error) => error.statusCode === 400,
    );
});
