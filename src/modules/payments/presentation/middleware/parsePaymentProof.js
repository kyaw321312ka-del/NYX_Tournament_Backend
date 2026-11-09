const multer = require('multer');
const PaymentError = require('../../domain/errors/PaymentError');

const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const parseMultipart = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_PROOF_SIZE,
        files: 1,
    },
}).single('proof');

function parsePaymentProof(req, res, next) {
    if (!req.is('multipart/form-data')) {
        return next(new PaymentError(400, 'Submit the payment screenshot as multipart/form-data.'));
    }

    return parseMultipart(req, res, (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                const message = error.code === 'LIMIT_FILE_SIZE'
                    ? 'Payment screenshot must be 10 MB or smaller.'
                    : 'Invalid payment screenshot upload.';
                return next(new PaymentError(statusCode, message));
            }
            return next(error);
        }

        if (!req.file) {
            return next(new PaymentError(400, 'A payment screenshot in the "proof" field is required.'));
        }
        return next();
    });
}

module.exports = parsePaymentProof;
