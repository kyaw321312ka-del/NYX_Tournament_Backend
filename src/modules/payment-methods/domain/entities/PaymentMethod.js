class PaymentMethod {
    constructor(record) {
        Object.assign(this, record);
    }

    static fromRecord(record) {
        return record ? new PaymentMethod(record) : null;
    }

    toJSON() {
        return {
            id: this.id,
            paymentMethodName: this.paymentMethodName,
            accountName: this.accountName,
            accountNumber: this.accountNumber,
            isActive: this.isActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = PaymentMethod;
