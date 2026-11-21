const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const createAgeGroupRouter = require('./ageGroupRoutes');
const schemas = require('../validators/ageGroupSchemas');

test('lists and gets age groups publicly while protecting writes', async (t) => {
    let adminChecked = false;
    const app = express();
    app.use(express.json());
    app.use('/api', createAgeGroupRouter({
        authenticate(req, res, next) {
            req.auth = { userId: 1 };
            next();
        },
        requireAdmin(req, res, next) {
            adminChecked = true;
            next();
        },
        schemas,
        controller: {
            async list(req, res) {
                return res.json({
                    success: true,
                    data: [{ id: 1, name: 'U10', age: 10 }],
                });
            },
            async get(req, res) {
                return res.json({
                    success: true,
                    data: { id: req.validatedParams.id, name: 'U10', age: 10 },
                });
            },
            async create(req, res) {
                return res.status(201).json({
                    success: true,
                    data: { id: 2, ...req.validatedBody },
                });
            },
            async update(req, res) {
                return res.json({
                    success: true,
                    data: { id: req.validatedParams.id, ...req.validatedBody },
                });
            },
            async remove(req, res) {
                return res.status(204).end();
            },
        },
    }));

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));
    const base = `http://127.0.0.1:${server.address().port}`;

    const list = await fetch(`${base}/api/age-groups`);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).data[0].name, 'U10');

    const get = await fetch(`${base}/api/age-groups/7`);
    assert.equal(get.status, 200);
    assert.equal((await get.json()).data.id, 7);

    const create = await fetch(`${base}/api/age-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'U12', age: 12 }),
    });
    assert.equal(create.status, 201);
    assert.equal(adminChecked, true);

    const update = await fetch(`${base}/api/age-groups/7`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: 14 }),
    });
    assert.equal(update.status, 200);

    const remove = await fetch(`${base}/api/age-groups/7`, { method: 'DELETE' });
    assert.equal(remove.status, 204);
});
