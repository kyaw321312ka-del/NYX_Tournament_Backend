class ListRegistrationStatuses {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute() {
        return this.registrationRepository.listStatuses();
    }
}

module.exports = ListRegistrationStatuses;
