const HttpError = require('../../../../shared/errors/HttpError');
const User = require('../../../auth/domain/entities/User');

const MAX_OTP_ATTEMPTS = 5;

class VerifyEmailChange {
    constructor({ userRepository, otpService }) {
        this.userRepository = userRepository;
        this.otpService = otpService;
    }

    async execute(userId, { otp }) {
        const pending = await this.userRepository.findPendingEmailChange(userId);
        if (!pending) {
            throw new HttpError(400, 'No pending email change was found.');
        }
        if (pending.otpExpiresAt <= new Date()) {
            await this.userRepository.deletePendingEmailChange(userId);
            throw new HttpError(400, 'The verification code has expired. Request the email change again.');
        }
        if (pending.attempts >= MAX_OTP_ATTEMPTS) {
            throw new HttpError(429, 'Too many incorrect verification codes. Request the email change again.');
        }
        if (!this.otpService.verify(otp, pending.otpHash)) {
            await this.userRepository.incrementPendingEmailChangeAttempts(pending.id);
            throw new HttpError(400, 'The verification code is invalid.');
        }

        try {
            const user = await this.userRepository.completeEmailChange(userId, pending.id);
            return User.fromRecord(user).toPublicProfile();
        } catch (error) {
            if (error.code === 'P2002') {
                throw new HttpError(409, 'An account with this email already exists.');
            }
            throw error;
        }
    }
}

module.exports = VerifyEmailChange;
