class RegistrationRepository {
    async create() {
        throw new Error('RegistrationRepository.create must be implemented.');
    }

    async findById() {
        throw new Error('RegistrationRepository.findById must be implemented.');
    }

    async listByUser() {
        throw new Error('RegistrationRepository.listByUser must be implemented.');
    }

    async listStatuses() {
        throw new Error('RegistrationRepository.listStatuses must be implemented.');
    }

    async createPartnerInvitation() {
        throw new Error('RegistrationRepository.createPartnerInvitation must be implemented.');
    }

    async listPartnerInvitations() {
        throw new Error('RegistrationRepository.listPartnerInvitations must be implemented.');
    }

    async acceptPartnerInvitation() {
        throw new Error('RegistrationRepository.acceptPartnerInvitation must be implemented.');
    }

    async declinePartnerInvitation() {
        throw new Error('RegistrationRepository.declinePartnerInvitation must be implemented.');
    }

    async cancelPartnerInvitation() {
        throw new Error('RegistrationRepository.cancelPartnerInvitation must be implemented.');
    }
}

module.exports = RegistrationRepository;
