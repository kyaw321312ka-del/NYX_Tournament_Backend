const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const parseTournamentMultipart = require('./parseTournamentMultipart');

const boundary = 'nyx-test-boundary';

function createMultipartBody(parts) {
    const body = parts.map(({ name, value, filename, mimeType }) => {
        const disposition = filename
            ? `Content-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${mimeType || 'application/octet-stream'}`
            : `Content-Disposition: form-data; name="${name}"`;
        const content = Buffer.isBuffer(value) ? value : Buffer.from(value);
        return Buffer.concat([
            Buffer.from(`--${boundary}\r\n${disposition}\r\n\r\n`),
            content,
            Buffer.from('\r\n'),
        ]);
    });
    return Buffer.concat([
        ...body,
        Buffer.from(`--${boundary}--\r\n`),
    ]);
}

function createTestServer() {
    const app = express();
    app.post('/upload', parseTournamentMultipart, (req, res) => {
        return res.status(200).json({
            body: req.body,
            fileName: req.file?.originalname,
            fileBuffer: req.file?.buffer.toString('hex'),
        });
    });
    app.use((error, req, res, next) => {
        return res.status(error.statusCode || 500).json({ error: error.message });
    });

    const server = http.createServer(app);
    return new Promise((resolve) => {
        server.listen(0, () => {
            const { port } = server.address();
            resolve({
                server,
                post: (parts) => new Promise((resolvePost, rejectPost) => {
                    const body = createMultipartBody(parts);
                    const request = http.request({
                        method: 'POST',
                        port,
                        path: '/upload',
                        headers: {
                            'content-type': `multipart/form-data; boundary=${boundary}`,
                            'content-length': body.length,
                        },
                    }, (response) => {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolvePost({
                            status: response.statusCode,
                            body: JSON.parse(Buffer.concat(chunks).toString()),
                        }));
                    });
                    request.on('error', rejectPost);
                    request.end(body);
                }),
            });
        });
    });
}

test('parses JSON tournament form field and optional banner in the same multipart request', async (t) => {
    const { server, post } = await createTestServer();
    t.after(() => server.close());
    const tournament = {
        title: 'NYX Open',
        startDate: '2027-05-10',
        endDate: '2027-05-11',
        categories: [{ pairingType: 'doubles' }],
    };
    const response = await post([
        { name: 'tournament', value: JSON.stringify(tournament) },
        {
            name: 'banner',
            filename: 'banner.jpg',
            mimeType: 'image/jpeg',
            value: Buffer.from([0xff, 0xd8, 0xff]),
        },
    ]);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.body, tournament);
    assert.equal(response.body.fileBuffer, Buffer.from([0xff, 0xd8, 0xff]).toString('hex'));
    assert.equal(response.body.fileName, 'banner.jpg');
});

test('rejects missing tournament form field and malformed tournament JSON', async (t) => {
    const { server, post } = await createTestServer();
    t.after(() => server.close());
    await t.test('missing field', async () => {
        const response = await post([]);
        assert.equal(response.status, 400);
        assert.match(response.body.error, /tournament.*text field/);
    });

    await t.test('malformed JSON', async () => {
        const response = await post([{ name: 'tournament', value: '{bad json' }]);
        assert.equal(response.status, 400);
        assert.match(response.body.error, /valid JSON/);
    });
});

test('leaves JSON requests untouched', async () => {
    const request = {
        body: { title: 'NYX Open' },
        is: () => false,
    };

    await new Promise((resolve, reject) => {
        parseTournamentMultipart(request, {}, (error) => {
            if (error) return reject(error);
            return resolve();
        });
    });
    assert.deepEqual(request.body, { title: 'NYX Open' });
});
