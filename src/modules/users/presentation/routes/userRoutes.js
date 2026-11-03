const express = require('express');
const multer = require('multer');
const HttpError = require('../../../../shared/errors/HttpError');
const UserController = require('../controllers/UserController');

const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const parseProfileImage = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: PROFILE_IMAGE_MAX_SIZE,
        files: 1,
    },
}).single('profileImage');

function createUserRouter({ authenticate, updatePlayerProfileImage }) {
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

    router.put(
        '/me/profile-image',
        authenticate,
        handleProfileImage,
        UserController.createUpdateProfileImageController(updatePlayerProfileImage),
    );
    router.get('/', UserController.listUsers);
    router.get('/:id', UserController.getUser);

    return router;
}

module.exports = createUserRouter;
