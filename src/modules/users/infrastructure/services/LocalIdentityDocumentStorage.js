const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const HttpError = require('../../../../shared/errors/HttpError');

const IMAGE_TYPES = [
    {
        extension: '.jpg',
        matches(buffer) {
            return buffer.length >= 3
                && buffer[0] === 0xff
                && buffer[1] === 0xd8
                && buffer[2] === 0xff;
        },
    },
    {
        extension: '.png',
        matches(buffer) {
            return buffer.length >= 8
                && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        },
    },
    {
        extension: '.webp',
        matches(buffer) {
            return buffer.length >= 12
                && buffer.toString('ascii', 0, 4) === 'RIFF'
                && buffer.toString('ascii', 8, 12) === 'WEBP';
        },
    },
];

class LocalIdentityDocumentStorage {
    constructor({ directory = path.resolve(__dirname, '..', '..', '..', '..', '..', 'uploads', 'identity-documents') } = {}) {
        this.directory = directory;
    }

    async save(buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new HttpError(400, 'Upload a JPEG, PNG, or WebP identity document.');
        }

        const imageType = IMAGE_TYPES.find(({ matches }) => matches(buffer));
        if (!imageType) {
            throw new HttpError(415, 'Identity documents must be valid JPEG, PNG, or WebP images.');
        }

        await fs.mkdir(this.directory, { recursive: true });
        const filename = `${randomUUID()}${imageType.extension}`;
        await fs.writeFile(path.join(this.directory, filename), buffer, { flag: 'wx' });
        return filename;
    }

    async remove(filename) {
        if (typeof filename !== 'string' || path.basename(filename) !== filename) {
            return;
        }
        if (!/^[\da-f-]+\.(jpg|png|webp)$/i.test(filename)) {
            return;
        }

        try {
            await fs.unlink(path.join(this.directory, filename));
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
}

module.exports = LocalIdentityDocumentStorage;
