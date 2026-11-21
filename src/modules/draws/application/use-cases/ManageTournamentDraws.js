class ManageTournamentDraws {
    constructor({ drawRepository }) {
        this.drawRepository = drawRepository;
    }

    listEligibleRegistrations(categoryId) {
        return this.drawRepository.listEligibleRegistrations(categoryId);
    }

    listConfigurationOptions() {
        return this.drawRepository.listConfigurationOptions();
    }

    getDrawConfiguration(categoryId) {
        return this.drawRepository.getDrawConfiguration(categoryId);
    }

    listDrawConfigurations() {
        return this.drawRepository.listDrawConfigurations();
    }

    createDraft(categoryId, configuration) {
        return this.drawRepository.createDraft(categoryId, configuration);
    }

    getLatestDraw(categoryId) {
        return this.drawRepository.getLatestDraw(categoryId);
    }

    getDraw(categoryId, drawId) {
        return this.drawRepository.getDraw(categoryId, drawId);
    }

    getPublishedDraw(categoryId) {
        return this.drawRepository.getPublishedDraw(categoryId);
    }

    assignPositions(drawId, assignments) {
        return this.drawRepository.assignPositions(drawId, assignments);
    }

    publish(drawId) {
        return this.drawRepository.publish(drawId);
    }

    recordMatchResult(drawId, matchId, games) {
        return this.drawRepository.recordMatchResult(drawId, matchId, games);
    }

    finalizeResults(drawId) {
        return this.drawRepository.finalizeResults(drawId);
    }

    listRankingPointAwards(categoryId) {
        return this.drawRepository.listRankingPointAwards(categoryId);
    }
}

module.exports = ManageTournamentDraws;
