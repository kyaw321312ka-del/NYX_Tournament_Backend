const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const AuthError = require('../../domain/errors/AuthError');

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
        jwtid: randomUUID(),
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

      if (typeof payload === 'string'
        || !payload.sub
        || !Number.isSafeInteger(Number(payload.sub))
        || typeof payload.jti !== 'string'
        || !Number.isSafeInteger(payload.exp)) {
        throw new AuthError(401, 'Invalid or expired access token.');
      }

      return {
        userId: Number(payload.sub),
        roleId: payload.roleId,
        tokenId: payload.jti,
        expiresAt: payload.exp,
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