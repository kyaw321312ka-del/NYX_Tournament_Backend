const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const createUserRouter = require('./userRoutes');

test('profile update accepts text fields, category IDs, and image uploads together', async (t) => {
    let update;
    const app = express();
    app.use(express.json());
    app.use('/api/users', createUserRouter({
        authenticate(req, res, next) {
            req.auth = { userId: 7 };
            next();
        },
        updateUserProfile: {
            async execute(userId, body, files) {
                update = { userId, body, files };
                return { user: { id: userId }, emailVerificationRequired: false, pendingEmail: null };
            },
        },
        updatePlayerProfileImage: { execute: async () => ({}) },
        updateIdentityDocuments: { execute: async () => ({}) },
        verifyEmailChange: { execute: async () => ({}) },
    }));
    app.use((error, req, res, next) => {
        res.status(error.statusCode ?? 500).json({ message: error.message });
    });

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));

    const form = new FormData();
    form.set('name', 'Updated Player');
    form.set('gender', 'female');
    form.set('phno', '+959123456789');
    form.set('password', 'new-password');
    form.set('currentPassword', 'current-password');
    form.set('categoryIds', '[1,2]');
    form.set('profileImage', new Blob(['profile'], { type: 'image/png' }), 'profile.png');
    form.set('frontIdImg', new Blob(['front'], { type: 'image/png' }), 'front.png');
    form.set('backIdImg', new Blob(['back'], { type: 'image/png' }), 'back.png');

    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/users/me`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer test-token' },
        body: form,
    });
    assert.equal(response.status, 200);
    assert.equal(update.userId, 7);
    assert.deepEqual(update.body.categoryIds, [1, 2]);
    assert.equal(update.body.password, 'new-password');
    assert.equal(update.files.profileImage[0].originalname, 'profile.png');
    assert.equal(update.files.frontIdImg[0].originalname, 'front.png');
    assert.equal(update.files.backIdImg[0].originalname, 'back.png');
});
