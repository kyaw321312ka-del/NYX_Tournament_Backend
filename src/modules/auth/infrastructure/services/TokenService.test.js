const test = require('node:test');
const assert = require('node:assert/strict');
const TokenService = require('./TokenService');

test('access tokens verify identity and reject tampering', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-bytes';

  try {
    const service = new TokenService();
    const token = service.issue({ id: 42, roleId: 3 });

    assert.deepEqual(service.verify(token), { userId: 42, roleId: 3 });
    assert.throws(() => service.verify(`${token}tampered`), {
      statusCode: 401,
      message: 'Invalid or expired access token.',
    });
  } finally {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  }
});
