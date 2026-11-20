class GetAdminPlayerDetails {
    constructor({ userRepository }) {
        this.userRepository = userRepository;
    }

    execute(userId) {
        return this.userRepository.getPlayerDetails(userId);
    }
}

module.exports = GetAdminPlayerDetails;
