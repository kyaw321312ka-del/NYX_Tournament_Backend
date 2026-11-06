class CreateTournamentDto {
    constructor({ title, bannerUrl = null, description = null, startDate, endDate, rankingPointsPool = 0, venues = [], rules = [], categories = [] }) {
        this.title = title;
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
