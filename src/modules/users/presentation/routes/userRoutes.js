const express = require('express');
const multer = require('multer');
const HttpError = require('../../../../shared/errors/HttpError');
const UserController = require('../controllers/UserController');

const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const IDENTITY_DOCUMENT_MAX_SIZE = 10 * 1024 * 1024;
const parseProfileImage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: PROFILE_IMAGE_MAX_SIZE,
        files: 1,
    },
}).single('profileImage');
const parseIdentityDocuments = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: IDENTITY_DOCUMENT_MAX_SIZE,
        files: 2,
    },
}).fields([
    { name: 'frontIdImg', maxCount: 1 },
    { name: 'backIdImg', maxCount: 1 },
]);

function createUserRouter({ authenticate, updatePlayerProfileImage, updateIdentityDocuments }) {
    const router = express.Router();
    const handleProfileImage = (req, res, next) => {
        parseProfileImage(req, res, (error) => {
            if (!error) {
                if (!req.file) {
                    return next(new HttpError(400, 'Provide a profile image in the "profileImage" form field.'));
                }
                return next();
            }

            if (error instanceof multer.MulterError) {
                const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                const message = error.code === 'LIMIT_FILE_SIZE'
                    ? 'Profile image must be 5 MB or smaller.'
                    : 'Invalid profile image upload.';
                return next(new HttpError(statusCode, message));
            }
            return next(error);
        });
    };
    const handleIdentityDocuments = (req, res, next) => {
        parseIdentityDocuments(req, res, (error) => {
            if (!error) {
                if (!req.files?.frontIdImg?.length && !req.files?.backIdImg?.length) {
                    return next(new HttpError(400, 'Upload at least one file: frontIdImg or backIdImg.'));
                }
                return next();
            }

            if (error instanceof multer.MulterError) {
                const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                const message = error.code === 'LIMIT_FILE_SIZE'
                    ? 'Each identity document must be 10 MB or smaller.'
                    : 'Invalid identity document upload.';
                return next(new HttpError(statusCode, message));
            }
            return next(error);
        });
    };

    router.put(
        '/me/profile-image',
        authenticate,
        handleProfileImage,
        UserController.createUpdateProfileImageController(updatePlayerProfileImage),
    );
    router.put(
        '/me/identity-documents',
        authenticate,
        handleIdentityDocuments,
        UserController.createUpdateIdentityDocumentsController(updateIdentityDocuments),
    );
    router.get('/', UserController.listUsers);
    router.get('/:id', UserController.getUser);

    return router;
}

module.exports = createUserRouter;
