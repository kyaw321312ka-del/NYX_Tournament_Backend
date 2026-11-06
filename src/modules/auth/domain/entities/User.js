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
      gender: this.gender,
      email: this.email,
      phno: this.phno,
      profileImageUrl: this.profileImageUrl,
      role: this.role.name,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;