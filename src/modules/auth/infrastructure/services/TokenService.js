const jwt = require('jsonwebtoken');
const AuthError = require('../../application/AuthError');

const TOKEN_ISSUER = 'nyx-tournament-backend';
const TOKEN_AUDIENCE = 'nyx-tournament-api';
const TOKEN_LIFETIME = '1h';

class TokenService {
  issue(user) {
    return jwt.sign(
      { roleId: user.roleId },
      this.getSecret(),
      {
        algorithm: 'HS256',
        audience: TOKEN_AUDIENCE,
        expiresIn: TOKEN_LIFETIME,
        issuer: TOKEN_ISSUER,
        subject: String(user.id),
      },
    );
  }

  verify(token) {
    try {
      const payload = jwt.verify(token, this.getSecret(), {
        algorithms: ['HS256'],
        audience: TOKEN_AUDIENCE,
        issuer: TOKEN_ISSUER,
      });

      if (typeof payload === 'string' || !payload.sub || !Number.isSafeInteger(Number(payload.sub))) {
        throw new AuthError(401, 'Invalid or expired access token.');
      }

      return {
        userId: Number(payload.sub),
        roleId: payload.roleId,
      };
    } catch (error) {
      if (error instanceof AuthError && error.statusCode === 500) {
        throw error;
      }
      throw new AuthError(401, 'Invalid or expired access token.');
    }
  }

  getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new AuthError(500, 'JWT_SECRET must be configured with at least 32 bytes.');
    }
    return secret;
  }
}

module.exports = TokenService;