class Registration {
    constructor(record) {
        Object.assign(this, record);
    }

    static fromRecord(record) {
        return record ? new Registration(record) : null;
    }

    toJSON() {
        return {
            id: this.id,
            tournamentCategoryId: this.tournamentCategoryId,
            registeredBy: this.registeredBy,
            statusId: this.statusId,
            registeredAt: this.registeredAt,
            updatedAt: this.updatedAt,
            status: this.status ? {
                id: this.status.id,
                name: this.status.name,
            } : null,
            category: this.category ? {
                id: this.category.id,
                tournamentId: this.category.tournamentId,
                categoryCode: this.category.categoryCode,
                categoryName: this.category.categoryName,
                entryFee: this.category.entryFee?.toString() ?? '0',
            } : null,
            creator: this.creator ? {
                id: this.creator.id,
                name: this.creator.name,
            } : null,
            members: this.members?.map((member) => ({
                id: member.id,
                registrationId: member.registrationId ?? this.id,
                userId: member.userId,
                user: member.user ? {
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                } : null,
            })) ?? [],
            payments: this.payments?.map((payment) => ({
                id: payment.id,
                paymentMethodId: payment.paymentMethodId,
                paymentMethodName: payment.paymentMethodName,
                accountName: payment.accountName,
                accountNumber: payment.accountNumber,
                amount: payment.amount.toString(),
                currency: payment.currency,
                proofImageUrl: `/api/admin/payments/${payment.id}/proof`,
                transactionReference: payment.transactionReference,
                status: payment.status,
                verifiedBy: payment.verifiedBy,
                verifiedAt: payment.verifiedAt,
                rejectionReason: payment.rejectionReason,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
            })) ?? [],
        };
    }
}

module.exports = Registration;
