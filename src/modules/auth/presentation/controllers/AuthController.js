const AuthError = require('../../application/AuthError');
const User = require('../../domain/entities/User');

function createAuthController({ registerUser, verifyEmailOtp, loginUser, authRepository }) {
  return {
    async register(req, res, next) {
      try {
        const result = await registerUser.execute(req.validatedBody);
        return res.status(202).json({ success: true, data: result });
      } catch (error) {
        return next(error);
      }
    },

    async verifyEmail(req, res, next) {
      try {
        const result = await verifyEmailOtp.execute(req.validatedBody);
        return res.status(200).json({ success: true, data: result });
      } catch (error) {
        return next(error);
      }
    },

    async login(req, res, next) {
      try {
        const result = await loginUser.execute(req.validatedBody);
        return res.status(200).json({ success: true, data: result });
      } catch (error) {
        return next(error);
      }
    },

    async me(req, res, next) {
      try {
        const userRecord = await authRepository.findUserById(req.auth.userId);
        if (!userRecord) {
          throw new AuthError(401, 'Invalid or expired access token.');
        }
        const user = User.fromRecord(userRecord);
        return res.status(200).json({
          success: true,
          data: { user: user.toPublicProfile() },
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = createAuthController;