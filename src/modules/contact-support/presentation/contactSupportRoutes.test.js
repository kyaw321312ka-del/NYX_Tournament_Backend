const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const { once } = require('node:events');
const createContactSupportRouter = require('./contactSupportRoutes');
const schemas = require('./contactSupportSchemas');

const contactSupport = {
    phone: '+95 9 123 456 789',
    website: 'www.nyxbadminton.com',
    email: 'support@nyxbadminton.com',
    address: '73 rd St, Between 102nd & 103rd, Chanmyathazi, Mandalay',
};

async function createServer(t, controller, adminCalls) {
    const app = express();
    app.use(express.json());
    app.use('/api', createContactSupportRouter({
        controller,
        schemas,
        authenticate(_req, _res, next) {
            next();
        },
        requireAdmin(_req, _res, next) {
            adminCalls.count += 1;
            next();
        },
    }));
    app.use((error, _req, res, _next) => {
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
        get: (_req, res) => res.json({ success: true, data: contactSupport }),
        create: (req, res) => res.status(201).json({
            success: true,
            data: req.validatedBody,
        }),
        update: (req, res) => res.json({ success: true, data: req.validatedBody }),
        remove: (_req, res) => res.status(204).end(),
    };
}

test('public contact details can be read without admin authentication', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const response = await fetch(`${baseUrl}/contact-support`);

    assert.equal(response.status, 200);
    assert.equal(adminCalls.count, 0);
    assert.deepEqual((await response.json()).data, contactSupport);
});

test('admin can create and update validated contact details', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const createResponse = await fetch(`${baseUrl}/admin/contact-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactSupport),
    });
    assert.equal(createResponse.status, 201);

    const updateResponse = await fetch(`${baseUrl}/admin/contact-support`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactSupport, phone: '+95 9 999 000 111' }),
    });
    assert.equal(updateResponse.status, 200);
    assert.equal(adminCalls.count, 2);
});

test('rejects invalid contact data and protects deletion', async (t) => {
    const adminCalls = { count: 0 };
    const baseUrl = await createServer(t, createController(), adminCalls);

    const invalid = await fetch(`${baseUrl}/admin/contact-support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactSupport, email: 'not-an-email' }),
    });
    assert.equal(invalid.status, 400);

    const removed = await fetch(`${baseUrl}/admin/contact-support`, {
        method: 'DELETE',
    });
    assert.equal(removed.status, 204);
    assert.equal(adminCalls.count, 2);
});
