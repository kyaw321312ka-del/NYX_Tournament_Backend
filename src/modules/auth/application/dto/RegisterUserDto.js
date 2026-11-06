class RegisterUserDto {
  constructor({ name, gender, phno, email, password, categoryIds }) {
    this.name = name.trim();
    this.gender = gender;
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