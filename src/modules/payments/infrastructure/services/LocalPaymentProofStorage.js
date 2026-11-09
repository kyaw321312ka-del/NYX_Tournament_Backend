const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const PaymentError = require('../../domain/errors/PaymentError');

const IMAGE_TYPES = [
    {
        extension: '.jpg',
        contentType: 'image/jpeg',
        matches(buffer) {
            return buffer.length >= 3
                && buffer[0] === 0xff
                && buffer[1] === 0xd8
                && buffer[2] === 0xff;
        },
    },
    {
        extension: '.png',
        contentType: 'image/png',
        matches(buffer) {
            return buffer.length >= 8
                && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        },
    },
    {
        extension: '.webp',
        contentType: 'image/webp',
        matches(buffer) {
            return buffer.length >= 12
                && buffer.toString('ascii', 0, 4) === 'RIFF'
                && buffer.toString('ascii', 8, 12) === 'WEBP';
        },
    },
];

class LocalPaymentProofStorage {
    constructor({
        directory = path.resolve(__dirname, '..', '..', '..', '..', '..', 'uploads', 'payment-proofs'),
    } = {}) {
        this.directory = directory;
    }

    async save(buffer) {
        if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
            throw new PaymentError(400, 'Upload a JPEG, PNG, or WebP payment screenshot.');
        }

        const imageType = IMAGE_TYPES.find(({ matches }) => matches(buffer));
        if (!imageType) {
            throw new PaymentError(415, 'Payment screenshots must be valid JPEG, PNG, or WebP images.');
        }

        await fs.mkdir(this.directory, { recursive: true });
        const filename = `${randomUUID()}${imageType.extension}`;
        await fs.writeFile(path.join(this.directory, filename), buffer, { flag: 'wx' });
        return filename;
    }

    async read(filename) {
        const imageType = IMAGE_TYPES.find(({ extension }) => filename?.endsWith(extension));
        if (
            !imageType
            || path.basename(filename) !== filename
            || !/^[\da-f-]+\.(jpg|png|webp)$/i.test(filename)
        ) {
            throw new PaymentError(404, 'Payment screenshot not found.');
        }

        try {
            return {
                buffer: await fs.readFile(path.join(this.directory, filename)),
                contentType: imageType.contentType,
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new PaymentError(404, 'Payment screenshot not found.');
            }
            throw error;
        }
    }

    async remove(filename) {
        if (
            typeof filename !== 'string'
            || path.basename(filename) !== filename
            || !/^[\da-f-]+\.(jpg|png|webp)$/i.test(filename)
        ) {
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

module.exports = LocalPaymentProofStorage;
