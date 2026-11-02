class DeclinePartnerInvitation {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, invitationId) {
        return this.registrationRepository.declinePartnerInvitation(userId, invitationId);
    }
}

module.exports = DeclinePartnerInvitation;
