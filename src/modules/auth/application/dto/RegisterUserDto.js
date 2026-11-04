class RegisterUserDto {
  constructor({ name, phno, email, password, categoryIds }) {
    this.name = name.trim();
    this.phno = phno || null;
    this.email = email.trim().toLowerCase();
    this.password = password;
    this.categoryIds = [...new Set(categoryIds.map(Number))];
  }

  static from(value) {
    return new RegisterUserDto(value);
  }
}

module.exports = RegisterUserDto;