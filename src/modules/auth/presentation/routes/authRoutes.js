const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const AuthError = require('../../domain/errors/AuthError');

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IDENTITY_DOCUMENT_SIZE = 10 * 1024 * 1024;
const parseRegistrationFiles = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IDENTITY_DOCUMENT_SIZE,
    files: 3,
  },
}).fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'frontIdImg', maxCount: 1 },
  { name: 'backIdImg', maxCount: 1 },
]);

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AuthError(400, result.error.issues.map((issue) => issue.message).join(' ')));
    }
    req.validatedBody = result.data;
    return next();
  };
}

function validateRegistrationFiles(req, res, next) {
  const frontFile = req.files?.frontIdImg?.[0];
  const backFile = req.files?.backIdImg?.[0];

  if (!frontFile || !backFile) {
    return next(new AuthError(400, 'Upload both frontIdImg and backIdImg files.'));
  }
  if (req.files?.profileImage?.[0]?.size > MAX_PROFILE_IMAGE_SIZE) {
    return next(new AuthError(413, 'Profile image must be 5 MB or smaller.'));
  }
  return next();
}

function parseRegistrationUpload(req, res, next) {
  parseRegistrationFiles(req, res, (error) => {
    if (!error) return validateRegistrationFiles(req, res, next);

    if (error instanceof multer.MulterError) {
      const statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Identity documents must be 10 MB or smaller; profile images must be 5 MB or smaller.'
        : 'Invalid registration file upload.';
      return next(new AuthError(statusCode, message));
    }

    return next(error);
  });
}

function createRateLimiter(max, windowMs) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    }),
  });
}

function createAuthRouter({ controller, schemas, authenticate }) {
  const router = express.Router();

  router.post(
    '/register',
    createRateLimiter(5, 15 * 60 * 1000),
    parseRegistrationUpload,
    validate(schemas.register),
    controller.register,
  );
  router.get('/categories', controller.listCategories);
  router.post('/verify-email', createRateLimiter(10, 15 * 60 * 1000), validate(schemas.verifyEmail), controller.verifyEmail);
  router.post('/login', createRateLimiter(10, 15 * 60 * 1000), validate(schemas.login), controller.login);
  router.get('/me', authenticate, controller.me);

  return router;
}

module.exports = createAuthRouter;