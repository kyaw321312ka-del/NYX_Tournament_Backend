const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const createCorsMiddleware = require('./configureCors');

test('allows configured frontend origins and handles preflight requests', async (t) => {
    const app = express();
    app.use(createCorsMiddleware('http://localhost:5173,http://frontend.example'));
    app.get('/api/test', (req, res) => res.json({ success: true }));

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));

    const url = `http://127.0.0.1:${server.address().port}/api/test`;
    const allowedResponse = await fetch(url, {
        headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(allowedResponse.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    const disallowedResponse = await fetch(url, {
        headers: { Origin: 'http://untrusted.example' },
    });
    assert.equal(disallowedResponse.headers.get('access-control-allow-origin'), null);

    const preflightResponse = await fetch(url, {
        method: 'OPTIONS',
        headers: {
            Origin: 'http://frontend.example',
            'Access-Control-Request-Method': 'PATCH',
            'Access-Control-Request-Headers': 'authorization,content-type',
        },
    });
    assert.equal(preflightResponse.status, 204);
    assert.equal(preflightResponse.headers.get('access-control-allow-origin'), 'http://frontend.example');
    assert.match(preflightResponse.headers.get('access-control-allow-methods'), /PATCH/);
});
