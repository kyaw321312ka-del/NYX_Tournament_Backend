class User {
  constructor(record) {
    Object.assign(this, record);
  }

  static fromRecord(record) {
    return new User(record);
  }

  toPublicProfile() {
    const profile = {
      id: this.id,
      name: this.name,
      gender: this.gender,
      birthday: this.birthday instanceof Date
        ? this.birthday.toISOString().slice(0, 10)
        : this.birthday ?? null,
      email: this.email,
      phno: this.phno,
      profileImageUrl: this.profileImageUrl,
      role: this.role.name,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
    };
    if (Array.isArray(this.categories)) {
      profile.categories = this.categories.map(({ category }) => ({
        id: category.id,
        name: category.name,
      }));
    }
    return profile;
  }
}

module.exports = User;