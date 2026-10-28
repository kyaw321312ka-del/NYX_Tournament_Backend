const AuthError = require('../../application/AuthError');

function createAuthenticate(tokenService) {
  return (req, res, next) => {
    const authorization = req.get('authorization');
    const match = authorization && authorization.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      return next(new AuthError(401, 'A bearer access token is required.'));
    }

    try {
      req.auth = tokenService.verify(match[1]);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = createAuthenticate;
