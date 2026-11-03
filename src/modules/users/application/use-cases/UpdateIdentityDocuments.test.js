const test = require('node:test');
const assert = require('node:assert/strict');
const UpdateIdentityDocuments = require('./UpdateIdentityDocuments');

test('saves submitted document sides, updates user columns, and removes replaced files', async () => {
    const calls = [];
    const useCase = new UpdateIdentityDocuments({
        documentStorage: {
            save: async (buffer) => {
                calls.push(['save', buffer.toString()]);
                return `${buffer.toString()}.jpg`;
            },
            remove: async (filename) => calls.push(['remove', filename]),
        },
        userRepository: {
            updateIdentityDocuments: async (userId, documents) => {
                calls.push(['update', userId, documents]);
                return {
                    user: {
                        id: userId,
                        frontIdImg: documents.frontIdImg ?? 'existing-front.jpg',
                        backIdImg: documents.backIdImg ?? 'existing-back.jpg',
                    },
                    previousDocuments: {
                        frontIdImg: documents.frontIdImg ? 'old-front.jpg' : null,
                        backIdImg: documents.backIdImg ? 'old-back.jpg' : null,
                    },
                };
            },
        },
    });

    const user = await useCase.execute(5, {
        frontIdImg: [{ buffer: Buffer.from('new-front') }],
        backIdImg: [{ buffer: Buffer.from('new-back') }],
    });

    assert.equal(user.frontIdImg, 'new-front.jpg');
    assert.equal(user.backIdImg, 'new-back.jpg');
    assert.deepEqual(calls.filter(([action]) => action === 'remove'), [
        ['remove', 'old-front.jpg'],
        ['remove', 'old-back.jpg'],
    ]);
});

test('cleans up newly saved documents if the database update fails', async () => {
    const removed = [];
    const useCase = new UpdateIdentityDocuments({
        documentStorage: {
            save: async (buffer) => `${buffer.toString()}.jpg`,
            remove: async (filename) => removed.push(filename),
        },
        userRepository: {
            updateIdentityDocuments: async () => {
                throw new Error('Database unavailable');
            },
        },
    });

    await assert.rejects(
        useCase.execute(5, {
            frontIdImg: [{ buffer: Buffer.from('front') }],
            backIdImg: [{ buffer: Buffer.from('back') }],
        }),
        /Database unavailable/,
    );
    assert.deepEqual(removed, ['front.jpg', 'back.jpg']);
});

test('requires at least one identity document upload', async () => {
    const useCase = new UpdateIdentityDocuments({
        documentStorage: { save: async () => assert.fail('Must not save an empty upload') },
        userRepository: { updateIdentityDocuments: async () => assert.fail('Must not update an empty upload') },
    });

    await assert.rejects(
        useCase.execute(5, {}),
        (error) => error.statusCode === 400,
    );
});
