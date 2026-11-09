const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const LocalPaymentProofStorage = require('./LocalPaymentProofStorage');

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('stores valid payment proof privately and reads it by generated filename', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nyx-payment-proof-'));
    const storage = new LocalPaymentProofStorage({ directory });
    t.after(() => fs.rm(directory, { recursive: true, force: true }));

    const filename = await storage.save(png);
    const proof = await storage.read(filename);

    assert.match(filename, /^[\da-f-]+\.png$/i);
    assert.deepEqual(proof.buffer, png);
    assert.equal(proof.contentType, 'image/png');
    assert.deepEqual(await fs.readdir(directory), [filename]);
    await storage.remove(filename);
    assert.deepEqual(await fs.readdir(directory), []);
});

test('rejects invalid proof bytes and unsafe file names', async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nyx-payment-proof-'));
    const storage = new LocalPaymentProofStorage({ directory });
    t.after(() => fs.rm(directory, { recursive: true, force: true }));

    await assert.rejects(storage.save(Buffer.from('not an image')), (error) => error.statusCode === 415);
    await assert.rejects(storage.read('../secret.png'), (error) => error.statusCode === 404);
});
