class ListAdminPlayers {
    constructor({ userRepository }) {
        this.userRepository = userRepository;
    }

    execute(pagination) {
        return this.userRepository.listPlayers(pagination);
    }
}

module.exports = ListAdminPlayers;
