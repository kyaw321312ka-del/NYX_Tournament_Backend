class User {
  constructor(record) {
    Object.assign(this, record);
  }

  static fromRecord(record) {
    return new User(record);
  }

  toPublicProfile() {
    const profileDetails = this.profile ?? this;
    const profile = {
      id: this.id,
      name: this.name,
      clubName: profileDetails.clubName ?? null,
      address: profileDetails.address ?? null,
      gender: profileDetails.gender ?? null,
      birthday: profileDetails.birthday instanceof Date
        ? profileDetails.birthday.toISOString().slice(0, 10)
        : profileDetails.birthday ?? null,
      email: this.email,
      phno: this.phno,
      profileImageUrl: profileDetails.profileImageUrl ?? null,
      role: this.role.name,
      emailVerifiedAt: this.emailVerifiedAt,
      createdAt: this.createdAt,
    };
    if (Array.isArray(this.categories)) {
      profile.categories = this.categories.map(({ category }) => ({
        id: category.id,
        categoryCode: category.categoryCode,
        name: category.name,
        pairingType: category.pairingType,
      }));
    }
    return profile;
  }

  toAccountProfile() {
    const profile = this.toPublicProfile();
    const documents = this.identityDocuments;
    return {
      ...profile,
      updatedAt: this.updatedAt ?? null,
      identityDocuments: {
        frontUploaded: Boolean(documents?.frontImageUrl),
        backUploaded: Boolean(documents?.backImageUrl),
        verificationStatus: documents?.verificationStatus ?? null,
      },
    };
  }
}

module.exports = User;