const CreateRegistrationDto = require('../dto/CreateRegistrationDto');

class CreateRegistration {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, input) {
        return this.registrationRepository.create({
            userId,
            ...CreateRegistrationDto.from(input),
        });
    }
}

module.exports = CreateRegistration;
