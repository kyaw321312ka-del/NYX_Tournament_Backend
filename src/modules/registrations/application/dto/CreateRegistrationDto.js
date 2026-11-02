class CreateRegistrationDto {
    static from(input = {}) {
        const members = Array.isArray(input.members)
            ? input.members
                  .map((member) => Number(member))
                  .filter((member) => Number.isInteger(member) && member > 0)
            : [];

        return {
            tournamentCategoryId: Number(input.tournamentCategoryId),
            members: [...new Set(members)],
        };
    }
}

module.exports = CreateRegistrationDto;
