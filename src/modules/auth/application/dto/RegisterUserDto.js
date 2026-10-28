class RegisterUserDto {
  constructor({ name, phno, email, password }) {
    this.name = name.trim();
    this.phno = phno || null;
    this.email = email.trim().toLowerCase();
    this.password = password;
  }

  static from(value) {
    return new RegisterUserDto(value);
  }
}

module.exports = RegisterUserDto;