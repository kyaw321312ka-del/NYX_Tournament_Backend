const express = require('express');
const multer = require('multer');
const HttpError = require('../../../../shared/errors/HttpError');
const validateRequest = require('../../../../shared/middleware/validateRequest');
const UserController = require('../controllers/UserController');
const userSchemas = require('../validators/userSchemas');

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
const parseProfileUpdate = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: IDENTITY_DOCUMENT_MAX_SIZE,
        files: 3,
    },
}).fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'frontIdImg', maxCount: 1 },
    { name: 'backIdImg', maxCount: 1 },
]);

function createUserRouter({
    authenticate,
    updatePlayerProfileImage,
    updateIdentityDocuments,
    updateUserProfile,
    verifyEmailChange,
    reviewIdentityDocuments,
    requireAdmin,
}) {
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
    const handleProfileUpdate = (req, res, next) => {
        parseProfileUpdate(req, res, (error) => {
            if (error) {
                if (error instanceof multer.MulterError) {
                    const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                    const message = error.code === 'LIMIT_FILE_SIZE'
                        ? 'Uploaded profile files must be 10 MB or smaller.'
                        : 'Invalid profile update upload.';
                    return next(new HttpError(statusCode, message));
                }
                return next(error);
            }

            if (req.files?.profileImage?.[0]?.size > PROFILE_IMAGE_MAX_SIZE) {
                return next(new HttpError(413, 'Profile image must be 5 MB or smaller.'));
            }

            if (typeof req.body.categoryIds === 'string') {
                try {
                    req.body.categoryIds = JSON.parse(req.body.categoryIds);
                } catch (parseError) {
                    if (!(parseError instanceof SyntaxError)) {
                        return next(parseError);
                    }
                    return next(new HttpError(400, 'categoryIds must be a JSON array of category IDs.'));
                }
            }
            return next();
        });
    };

    router.patch(
        '/me',
        authenticate,
        handleProfileUpdate,
        validateRequest(userSchemas.updateProfileSchema),
        UserController.createUpdateProfileController(updateUserProfile),
    );
    router.post(
        '/me/email/verify',
        authenticate,
        validateRequest(userSchemas.verifyEmailChangeSchema),
        UserController.createVerifyEmailChangeController(verifyEmailChange),
    );
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
    router.patch(
        '/:userId/identity-documents/status',
        authenticate,
        requireAdmin,
        validateRequest(userSchemas.userIdSchema, 'params'),
        validateRequest(userSchemas.reviewIdentityDocumentsSchema),
        UserController.createReviewIdentityDocumentsController(reviewIdentityDocuments),
    );
    router.get('/', UserController.listUsers);
    router.get('/:id', UserController.getUser);

    return router;
}

module.exports = createUserRouter;
