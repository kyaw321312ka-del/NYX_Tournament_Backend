const AuthError = require('../../domain/errors/AuthError');

function createAuthenticate(tokenService, tokenRevocationRepository) {
  return async (req, res, next) => {
    const authorization = req.get('authorization');
    const match = authorization && authorization.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      return next(new AuthError(401, 'A bearer access token is required.'));
    }

    try {
      const auth = tokenService.verify(match[1]);
      if (await tokenRevocationRepository?.isRevoked(auth.tokenId)) {
        throw new AuthError(401, 'Invalid or expired access token.');
      }
      req.auth = auth;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = createAuthenticate;
