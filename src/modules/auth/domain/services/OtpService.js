const { createHmac, randomInt, timingSafeEqual } = require('node:crypto');
const AuthError = require('../../application/AuthError');

const OTP_LIFETIME_MS = 10 * 60 * 1000;

class OtpService {
  create() {
    const code = String(randomInt(100000, 1000000));
    return {
      code,
      hash: this.hash(code),
      expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
    };
  }

  verify(code, expectedHash) {
    const suppliedHash = Buffer.from(this.hash(code), 'hex');
    const storedHash = Buffer.from(expectedHash, 'hex');
    return suppliedHash.length === storedHash.length
      && timingSafeEqual(suppliedHash, storedHash);
  }

  hash(code) {
    const secret = process.env.OTP_SECRET;
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new AuthError(500, 'OTP_SECRET must be configured with at least 32 bytes.');
    }

    return createHmac('sha256', secret).update(code).digest('hex');
  }
}

module.exports = OtpService;