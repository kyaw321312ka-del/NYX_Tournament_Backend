const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const LocalTournamentBannerStorage = require('./LocalTournamentBannerStorage');

async function createStorage(t) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nyx-tournament-banners-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    return new LocalTournamentBannerStorage({ directory });
}

test('stores JPEG, PNG, and WebP banners with public URLs and generated filenames', async (t) => {
    const storage = await createStorage(t);
    const images = [
        { buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]), extension: '.jpg' },
        { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), extension: '.png' },
        { buffer: Buffer.from('RIFF0000WEBP', 'ascii'), extension: '.webp' },
    ];

    for (const { buffer, extension } of images) {
        const url = await storage.save(buffer);
        assert.match(url, new RegExp(`^/uploads/tournament-banners/[\\da-f-]+\\${extension}$`, 'i'));
        assert.deepEqual(await fs.readFile(path.join(storage.directory, path.basename(url))), buffer);
    }
});

test('rejects empty or unsupported banner data', async (t) => {
    const storage = await createStorage(t);

    await assert.rejects(storage.save(Buffer.alloc(0)), (error) => error.statusCode === 400);
    await assert.rejects(storage.save(Buffer.from('not an image')), (error) => error.statusCode === 415);
});

test('removes only generated files in the tournament banner directory', async (t) => {
    const storage = await createStorage(t);
    const url = await storage.save(Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    const filePath = path.join(storage.directory, path.basename(url));

    await storage.remove('/uploads/tournament-banners/../../private.jpg');
    assert.equal(await fs.access(filePath).then(() => true), true);

    await storage.remove(url);
    await assert.rejects(fs.access(filePath), (error) => error.code === 'ENOENT');
});
