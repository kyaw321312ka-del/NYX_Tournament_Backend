const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const createAdminUserRouter = require('./adminUserRoutes');

test('lists players through the admin-only endpoint with pagination', async (t) => {
    let query;
    let adminChecked = false;
    const app = express();
    app.use('/api', createAdminUserRouter({
        authenticate(req, res, next) {
            req.auth = { userId: 1 };
            next();
        },
        requireAdmin(req, res, next) {
            adminChecked = true;
            next();
        },
        listAdminPlayers: {
            async execute(pagination) {
                query = pagination;
                return {
                    items: [{ playerId: '#NYX-2', points: 3650 }],
                    pagination: { ...pagination, total: 1, pageCount: 1 },
                };
            },
        },
        getAdminPlayerDetails: {
            async execute(userId) {
                return {
                    id: userId,
                    name: 'Aung Myo',
                    points: 3650,
                    identityDocuments: {
                        frontIdImg: `/api/admin/users/${userId}/identity-documents/front`,
                        backIdImg: `/api/admin/users/${userId}/identity-documents/back`,
                    },
                };
            },
        },
        getAdminIdentityDocument: {
            async execute(userId, side) {
                assert.equal(userId, 8843);
                assert.equal(side, 'front');
                return {
                    buffer: Buffer.from('identity image'),
                    contentType: 'image/jpeg',
                };
            },
        },
    }));

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/users?page=2&pageSize=10`,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(adminChecked, true);
    assert.deepEqual(query, { page: 2, pageSize: 10 });
    assert.deepEqual(body.data, [{ playerId: '#NYX-2', points: 3650 }]);
    assert.deepEqual(body.pagination, { page: 2, pageSize: 10, total: 1, pageCount: 1 });

    const detailsResponse = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/users/8843`,
    );
    const detailsBody = await detailsResponse.json();
    assert.equal(detailsResponse.status, 200);
    assert.equal(detailsBody.data.identityDocuments.frontIdImg, '/api/admin/users/8843/identity-documents/front');
    assert.equal(detailsBody.data.identityDocuments.backIdImg, '/api/admin/users/8843/identity-documents/back');

    const documentResponse = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/users/8843/identity-documents/front`,
    );
    assert.equal(documentResponse.status, 200);
    assert.equal(documentResponse.headers.get('content-type'), 'image/jpeg');
    assert.equal(documentResponse.headers.get('cache-control'), 'private, no-store');
    assert.equal(await documentResponse.text(), 'identity image');
});
