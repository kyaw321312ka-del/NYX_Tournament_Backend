class TournamentPayment {
    constructor(record) {
        Object.assign(this, record);
    }

    static fromRecord(record) {
        return record ? new TournamentPayment(record) : null;
    }

    toJSON() {
        return {
            id: this.id,
            registrationId: this.registrationId,
            paymentMethodId: this.paymentMethodId,
            paymentMethodName: this.paymentMethodName,
            accountName: this.accountName,
            accountNumber: this.accountNumber,
            amount: this.amount.toString(),
            currency: this.currency,
            proofImageUrl: `/api/admin/payments/${this.id}/proof`,
            transactionReference: this.transactionReference,
            status: this.status,
            verifiedBy: this.verifiedBy,
            verifiedAt: this.verifiedAt,
            rejectionReason: this.rejectionReason,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            registration: this.registration ? {
                id: this.registration.id,
                registeredBy: this.registration.registeredBy,
                registeredAt: this.registration.registeredAt,
                status: this.registration.status?.name ?? null,
                category: this.registration.category ? {
                    id: this.registration.category.id,
                    categoryCode: this.registration.category.categoryCode,
                    categoryName: this.registration.category.categoryName,
                    entryFee: this.registration.category.entryFee.toString(),
                    tournament: this.registration.category.tournament,
                } : null,
                creator: this.registration.creator ?? null,
                members: this.registration.members?.map((member) => ({
                    userId: member.userId,
                    name: member.user.name,
                    email: member.user.email,
                })) ?? [],
            } : null,
        };
    }
}

module.exports = TournamentPayment;
