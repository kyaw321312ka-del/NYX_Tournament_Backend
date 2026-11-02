const CreatePartnerInvitationDto = require('../dto/CreatePartnerInvitationDto');

class CreatePartnerInvitation {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, input) {
        return this.registrationRepository.createPartnerInvitation({
            userId,
            ...CreatePartnerInvitationDto.from(input),
        });
    }
}

module.exports = CreatePartnerInvitation;
