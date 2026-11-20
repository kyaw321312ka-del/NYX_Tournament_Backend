const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const app = require('./app');

test('login endpoint supports both auth prefixes and allows the production frontend', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));

    for (const prefix of ['/auth', '/api/auth']) {
        const response = await fetch(`http://127.0.0.1:${server.address().port}${prefix}/login`, {
            method: 'POST',
            headers: {
                Origin: 'https://www.nyxtournament.com',
                'Content-Type': 'application/json',
            },
            body: '{}',
        });

        assert.equal(response.status, 400);
        assert.equal(
            response.headers.get('access-control-allow-origin'),
            'https://www.nyxtournament.com',
        );
    }
});

test('admin player-list route is mounted under the API prefix', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));

    const response = await fetch(
        `http://127.0.0.1:${server.address().port}/api/admin/users?page=1&pageSize=20`,
    );

    assert.equal(response.status, 401);
    assert.notEqual((await response.json()).message, 'Route not found.');
});

test('auth rate limits use the client IP forwarded by the immediate proxy', async (t) => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    }));

    const login = (ip) => fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': ip,
        },
        body: '{}',
    });

    for (let request = 0; request < 10; request += 1) {
        assert.equal((await login('198.51.100.10')).status, 400);
    }
    assert.equal((await login('198.51.100.10')).status, 429);
    assert.equal((await login('198.51.100.11')).status, 400);
});
