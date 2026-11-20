const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const { once } = require('node:events');
const createDrawRouter = require('./drawRoutes');
const schemas = require('../validators/drawSchemas');

async function createServer(t, controller, adminCalls) {
    const app = express();
    app.use(express.json());
    app.use('/api', createDrawRouter({
        controller,
        schemas,
        authenticate(req, res, next) {
            req.auth = { userId: 1 };
            next();
        },
        requireAdmin(req, res, next) {
            adminCalls.count += 1;
            next();
        },
    }));
    app.use((error, req, res, next) => {
        res.status(error.statusCode ?? 500).json({ success: false, message: error.message });
    });

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));
    return `http://127.0.0.1:${server.address().port}/api`;
}

function createController() {
    return {
        listEligibleRegistrations: (_req, res) => res.json({ success: true, data: [] }),
        createDraft: (req, res) => res.status(201).json({
            success: true,
            data: { categoryId: req.validatedParams.categoryId, ...req.validatedBody },
        }),
        getLatestDraw: (_req, res) => res.json({ success: true }),
        getDraw: (_req, res) => res.json({ success: true }),
        getPublishedDraw: (_req, res) => res.json({ success: true, data: { status: 'PUBLISHED' } }),
        assignPositions: (_req, res) => res.json({ success: true }),
        publish: (_req, res) => res.json({ success: true }),
    };
}

test('admin draw creation validates input and reaches the guarded endpoint', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/admin/tournament-categories/4/draws`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            drawFormat: 'SINGLE_ELIMINATION',
            seedingMethod: 'MANUAL',
        }),
    });

    assert.equal(response.status, 201);
    assert.equal(adminCalls.count, 1);
    assert.deepEqual((await response.json()).data, {
        categoryId: 4,
        drawFormat: 'SINGLE_ELIMINATION',
        seedingMethod: 'MANUAL',
    });
});

test('public draw reads do not pass through admin authentication', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/tournament-categories/4/draw`);

    assert.equal(response.status, 200);
    assert.equal(adminCalls.count, 0);
    assert.deepEqual(await response.json(), {
        success: true,
        data: { status: 'PUBLISHED' },
    });
});
