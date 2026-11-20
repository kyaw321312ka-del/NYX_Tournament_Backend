class ReviewIdentityDocuments {
    constructor({ userRepository }) {
        this.userRepository = userRepository;
    }

    execute(userId, verificationStatus) {
        return this.userRepository.reviewIdentityDocuments(userId, verificationStatus);
    }
}

module.exports = ReviewIdentityDocuments;
