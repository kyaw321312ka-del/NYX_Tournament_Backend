const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

class PasswordHasher {
  hash(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  verify(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }
}

module.exports = PasswordHasher;