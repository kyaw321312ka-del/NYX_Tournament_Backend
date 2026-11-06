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
            categories: this.categories?.map((category) => ({
                ...category,
                entryFee: category.entryFee?.toString() ?? '0',
                pointTiers: category.pointTiers,
            })),
        };
    }
}

module.exports = Tournament;
