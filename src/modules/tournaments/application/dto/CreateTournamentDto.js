class CreateTournamentDto {
    constructor({ title, entryFee = 0, bannerUrl = null, description = null, startDate, endDate, rankingPointsPool = 0, venues = [], rules = [], categories = [] }) {
        this.title = title;
        this.entryFee = entryFee;
        this.bannerUrl = bannerUrl;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
        this.rankingPointsPool = rankingPointsPool;
        this.venues = venues;
        this.rules = rules;
        this.categories = categories;
    }

    static from(input) {
        return new CreateTournamentDto(input);
    }
}

module.exports = CreateTournamentDto;
