class UpdateTournamentDto {
    constructor(input) {
        Object.assign(this, input);
    }

    static from(input) {
        return new UpdateTournamentDto(input);
    }
}

module.exports = UpdateTournamentDto;
