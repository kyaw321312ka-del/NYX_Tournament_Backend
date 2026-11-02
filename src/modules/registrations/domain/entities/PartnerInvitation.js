class PartnerInvitation {
    constructor(record) {
        Object.assign(this, record);
    }

    static fromRecord(record) {
        return record ? new PartnerInvitation(record) : null;
    }

    toJSON() {
        return {
            id: this.id,
            tournamentCategoryId: this.tournamentCategoryId,
            invitedBy: this.invitedBy,
            invitedUserId: this.invitedUserId,
            status: this.status,
            expiresAt: this.expiresAt,
            respondedAt: this.respondedAt,
            registrationId: this.registrationId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            category: this.category ? {
                id: this.category.id,
                tournamentId: this.category.tournamentId,
                categoryCode: this.category.categoryCode,
                categoryName: this.category.categoryName,
                pairingType: this.category.pairingType,
                tournament: this.category.tournament ? {
                    id: this.category.tournament.id,
                    title: this.category.tournament.title,
                } : undefined,
            } : undefined,
            inviter: this.inviter ? {
                id: this.inviter.id,
                name: this.inviter.name,
                email: this.inviter.email,
            } : undefined,
            invitedUser: this.invitedUser ? {
                id: this.invitedUser.id,
                name: this.invitedUser.name,
                email: this.invitedUser.email,
            } : undefined,
        };
    }
}

module.exports = PartnerInvitation;
