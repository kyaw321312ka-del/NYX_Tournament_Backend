class ManageContactSupport {
    constructor({ contactSupportRepository }) {
        this.contactSupportRepository = contactSupportRepository;
    }

    get() {
        return this.contactSupportRepository.get();
    }

    create(input) {
        return this.contactSupportRepository.create(input);
    }

    update(input) {
        return this.contactSupportRepository.update(input);
    }

    remove() {
        return this.contactSupportRepository.remove();
    }
}

module.exports = ManageContactSupport;
