class CreatePartnerInvitationDto {
    static from(input = {}) {
        return {
            tournamentCategoryId: Number(input.tournamentCategoryId),
            partnerEmail: input.partnerEmail.trim().toLowerCase(),
        };
    }
}

module.exports = CreatePartnerInvitationDto;
