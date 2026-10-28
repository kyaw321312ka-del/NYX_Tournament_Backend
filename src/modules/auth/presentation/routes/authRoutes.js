const express = require('express');
const rateLimit = require('express-rate-limit');
const AuthError = require('../../application/AuthError');

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

  router.post('/register', createRateLimiter(5, 15 * 60 * 1000), validate(schemas.register), controller.register);
  router.post('/verify-email', createRateLimiter(10, 15 * 60 * 1000), validate(schemas.verifyEmail), controller.verifyEmail);
  router.post('/login', createRateLimiter(10, 15 * 60 * 1000), validate(schemas.login), controller.login);
  router.get('/me', authenticate, controller.me);

  return router;
}

module.exports = createAuthRouter;