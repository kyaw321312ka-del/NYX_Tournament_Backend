class CancelPartnerInvitation {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, invitationId) {
        return this.registrationRepository.cancelPartnerInvitation(userId, invitationId);
    }
}

module.exports = CancelPartnerInvitation;
