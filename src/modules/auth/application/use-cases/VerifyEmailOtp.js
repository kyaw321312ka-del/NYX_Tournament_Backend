const AuthError = require('../AuthError');
const User = require('../../domain/entities/User');

const MAX_OTP_ATTEMPTS = 5;

class VerifyEmailOtp {
  constructor({ authRepository, otpService, tokenService }) {
    this.authRepository = authRepository;
    this.otpService = otpService;
    this.tokenService = tokenService;
  }

  async execute({ email, otp }) {
    const normalizedEmail = email.trim().toLowerCase();
    const pending = await this.authRepository.findPendingRegistration(normalizedEmail);

    if (!pending) {
      throw new AuthError(400, 'No pending registration was found. Register again to request a new code.');
    }

    if (pending.otpExpiresAt <= new Date()) {
      await this.authRepository.deletePendingRegistration(pending.id);
      throw new AuthError(400, 'The verification code has expired. Register again to request a new code.');
    }

    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      throw new AuthError(429, 'Too many incorrect verification codes. Register again to request a new code.');
    }

    if (!this.otpService.verify(otp, pending.otpHash)) {
      await this.authRepository.incrementPendingAttempts(pending.id);
      throw new AuthError(400, 'The verification code is invalid.');
    }

    let userRecord;
    try {
      userRecord = await this.authRepository.completePendingRegistration(pending);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new AuthError(409, 'An account with this email already exists.');
      }
      throw error;
    }

    const user = User.fromRecord(userRecord);
    return {
      token: this.tokenService.issue(user),
      user: user.toPublicProfile(),
    };
  }
}

module.exports = VerifyEmailOtp;