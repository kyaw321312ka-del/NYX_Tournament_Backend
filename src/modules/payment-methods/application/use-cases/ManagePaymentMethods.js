class ManagePaymentMethods {
    constructor({ paymentMethodRepository }) {
        this.paymentMethodRepository = paymentMethodRepository;
    }

    create(input) {
        return this.paymentMethodRepository.create(input);
    }

    listAll() {
        return this.paymentMethodRepository.list();
    }

    listActive() {
        return this.paymentMethodRepository.list({ activeOnly: true });
    }

    get(id) {
        return this.paymentMethodRepository.findById(id);
    }

    update(id, input) {
        return this.paymentMethodRepository.update(id, input);
    }

    setStatus(id, isActive) {
        return this.paymentMethodRepository.setStatus(id, isActive);
    }
}

module.exports = ManagePaymentMethods;
