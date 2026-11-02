class ListSentInvitations {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, query = {}) {
        return this.registrationRepository.listPartnerInvitations(userId, 'sent', query);
    }
}

module.exports = ListSentInvitations;
