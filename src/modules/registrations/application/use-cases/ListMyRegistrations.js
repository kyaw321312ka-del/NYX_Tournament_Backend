class ListMyRegistrations {
    constructor({ registrationRepository }) {
        this.registrationRepository = registrationRepository;
    }

    async execute(userId, query = {}) {
        return this.registrationRepository.listByUser(userId, {
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20,
        });
    }
}

module.exports = ListMyRegistrations;
