const test = require('node:test');
const assert = require('node:assert/strict');
const OtpService = require('./OtpService');

test('OTP service creates verifiable six-digit codes', () => {
  const previousSecret = process.env.OTP_SECRET;
  process.env.OTP_SECRET = 'test-only-otp-secret-with-at-least-32-bytes';

  try {
    const service = new OtpService();
    const otp = service.create();
    assert.match(otp.code, /^\d{6}$/);
    assert.equal(service.verify(otp.code, otp.hash), true);
    const incorrectCode = otp.code === '000000' ? '000001' : '000000';
    assert.equal(service.verify(incorrectCode, otp.hash), false);
    assert.ok(otp.expiresAt.getTime() > Date.now());
  } finally {
    if (previousSecret === undefined) {
      delete process.env.OTP_SECRET;
    } else {
      process.env.OTP_SECRET = previousSecret;
    }
  }
});
