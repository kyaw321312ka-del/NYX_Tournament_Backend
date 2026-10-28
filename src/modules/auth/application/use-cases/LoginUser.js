const AuthError = require('../AuthError');
const User = require('../../domain/entities/User');

class LoginUser {
  constructor({ authRepository, passwordHasher, tokenService }) {
    this.authRepository = authRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async execute({ email, password }) {
    const userRecord = await this.authRepository.findUserByEmail(email.trim().toLowerCase());
    const passwordMatches = userRecord
      ? await this.passwordHasher.verify(password, userRecord.passwordHash)
      : false;

    if (!userRecord || !passwordMatches) {
      throw new AuthError(401, 'Invalid email or password.');
    }

    if (!userRecord.emailVerifiedAt) {
      throw new AuthError(403, 'Verify your email before signing in.');
    }

    const user = User.fromRecord(userRecord);
    return {
      token: this.tokenService.issue(user),
      user: user.toPublicProfile(),
    };
  }
}

module.exports = LoginUser;
