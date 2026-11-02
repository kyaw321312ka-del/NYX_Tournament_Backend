class ListReceivedInvitations {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, query = {}) {
        return this.registrationRepository.listPartnerInvitations(userId, 'received', query);
    }
}

module.exports = ListReceivedInvitations;
