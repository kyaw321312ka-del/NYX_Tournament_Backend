class ManageAgeGroups {
    constructor({ ageGroupRepository }) {
        this.ageGroupRepository = ageGroupRepository;
    }

    list() {
        return this.ageGroupRepository.list();
    }

    get(id) {
        return this.ageGroupRepository.findById(id);
    }

    create(input) {
        return this.ageGroupRepository.create(input);
    }

    update(id, input) {
        return this.ageGroupRepository.update(id, input);
    }

    remove(id) {
        return this.ageGroupRepository.remove(id);
    }
}

module.exports = ManageAgeGroups;
