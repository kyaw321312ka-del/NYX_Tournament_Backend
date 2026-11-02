class AcceptPartnerInvitation {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, invitationId) {
        return this.registrationRepository.acceptPartnerInvitation(userId, invitationId);
    }
}

module.exports = AcceptPartnerInvitation;
