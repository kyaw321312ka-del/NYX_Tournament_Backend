class Tournament {
    constructor(record) {
        Object.assign(this, record);
    }

    static fromRecord(record) {
        return record ? new Tournament(record) : null;
    }

    toJSON() {
        return {
            id: this.id,
            createdBy: this.createdBy,
            title: this.title,
            bannerUrl: this.bannerUrl,
            description: this.description,
            startDate: this.startDate,
            endDate: this.endDate,
            rankingPointsPool: this.rankingPointsPool,
            publicationStatus: this.publicationStatus,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            creator: this.creator ? {
                id: this.creator.id,
                name: this.creator.name,
            } : undefined,
            venues: this.venues,
            rules: this.rules,
            categories: this.categories?.map((category) => {
                const {
                    eventCategory,
                    ageGroup,
                    ...tournamentCategory
                } = category;
                return {
                    ...tournamentCategory,
                    categoryCode: eventCategory?.categoryCode ?? category.categoryCode,
                    categoryName: eventCategory?.name ?? category.categoryName,
                    pairingType: eventCategory?.pairingType ?? category.pairingType,
                    ageGroup: ageGroup ? {
                        ...ageGroup,
                    } : null,
                    entryFee: category.entryFee?.toString() ?? '0',
                    pointTiers: category.pointTiers,
                };
            }),
        };
    }
}

module.exports = Tournament;
