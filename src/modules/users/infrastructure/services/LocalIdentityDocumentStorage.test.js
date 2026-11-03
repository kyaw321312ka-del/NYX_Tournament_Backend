const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const LocalIdentityDocumentStorage = require('./LocalIdentityDocumentStorage');

async function createStorage(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nyx-identity-documents-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return new LocalIdentityDocumentStorage({ directory });
}

test('stores supported image types as generated private filenames', async (t) => {
    const storage = await createStorage(t);
    const images = [
        { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]), extension: '.jpg' },
        { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), extension: '.png' },
        { buffer: Buffer.from('RIFF0000WEBP', 'ascii'), extension: '.webp' },
    ];

    for (const { buffer, extension } of images) {
        const filename = await storage.save(buffer);
        assert.match(filename, new RegExp(`^[\\da-f-]+\\${extension}$`, 'i'));
        assert.deepEqual(await fs.readFile(path.join(storage.directory, filename)), buffer);
    }
});

test('rejects empty or unsupported identity document data', async (t) => {
    const storage = await createStorage(t);

    await assert.rejects(storage.save(Buffer.alloc(0)), (error) => error.statusCode === 400);
    await assert.rejects(storage.save(Buffer.from('not an image')), (error) => error.statusCode === 415);
});

test('removes only generated filenames from the private storage directory', async (t) => {
    const storage = await createStorage(t);
    const filename = await storage.save(Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    const filePath = path.join(storage.directory, filename);

    await storage.remove('../secret.jpg');
    assert.equal(await fs.access(filePath).then(() => true), true);

    await storage.remove(filename);
    await assert.rejects(fs.access(filePath), (error) => error.code === 'ENOENT');
});
