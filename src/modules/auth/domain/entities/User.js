class User {
  constructor(record) {
    Object.assign(this, record);
  }

  static fromRecord(record) {
    return new User(record);
  }

  toPublicProfile() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phno: this.phno,
      role: this.role.name,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;