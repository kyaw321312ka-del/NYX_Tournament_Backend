function serializeRegistration(registration) {
    if (!registration) return null;
    return {
        id: registration.id,
        registeredAt: registration.registeredAt,
        status: registration.status?.name ?? null,
        members: (registration.members ?? []).map(({ user }) => ({
            id: user.id,
            name: user.name,
        })),
    };
}

function serializeParticipant(participant) {
    if (!participant) return null;
    return {
        id: participant.id,
        registrationId: participant.registrationId,
        bracketPosition: participant.bracketPosition,
        seedNumber: participant.seedNumber,
        registration: serializeRegistration(participant.registration),
    };
}

class TournamentDraw {
    constructor(record) {
        Object.assign(this, record);
    }

    static fromRecord(record) {
        return record ? new TournamentDraw(record) : null;
    }

    toJSON() {
        const rounds = new Map();
        const {
            eligibleRegistrationIds = [],
            ...configuration
        } = this.configurationSnapshot ?? {};
        for (const match of this.matches ?? []) {
            if (!rounds.has(match.roundNumber)) {
                rounds.set(match.roundNumber, []);
            }
            rounds.get(match.roundNumber).push({
                id: match.id,
                matchNumber: match.matchNumber,
                status: match.status,
                result: match.result ?? null,
                winner: serializeParticipant(match.winnerParticipant),
                slots: (match.slots ?? []).map((slot) => ({
                    slotNumber: slot.slotNumber,
                    bracketPosition: slot.bracketPosition,
                    sourceMatchId: slot.sourceMatchId,
                    participant: serializeParticipant(slot.participant),
                })),
            });
        }

        return {
            id: this.id,
            tournamentCategoryId: this.tournamentCategoryId,
            version: this.version,
            status: this.status,
            configuration: {
                drawFormat: configuration.drawFormat ?? 'SINGLE_ELIMINATION',
                seedingMethod: configuration.seedingMethod ?? 'MANUAL',
                bracketSize: configuration.bracketSize ?? null,
                scoringRules: configuration.scoringRules ?? null,
                pointTiers: configuration.pointTiers ?? [],
                eligibleRegistrationCount: eligibleRegistrationIds.length,
            },
            positions: (this.configurationSnapshot?.positions ?? []).map((position) => ({
                bracketPosition: position.bracketPosition,
                assignable: position.assignable,
            })),
            generatedAt: this.generatedAt,
            publishedAt: this.publishedAt,
            finalizedAt: this.finalizedAt,
            category: this.tournamentCategory ? {
                id: this.tournamentCategory.id,
                tournamentId: this.tournamentCategory.tournamentId,
                tournamentTitle: this.tournamentCategory.tournament?.title ?? null,
                categoryCode: this.tournamentCategory.eventCategory?.categoryCode ?? null,
                categoryName: this.tournamentCategory.eventCategory?.name ?? null,
                pairingType: this.tournamentCategory.eventCategory?.pairingType ?? null,
            } : null,
            participants: (this.participants ?? []).map(serializeParticipant),
            rounds: [...rounds.entries()].map(([roundNumber, matches]) => ({
                roundNumber,
                matches,
            })),
        };
    }
}

module.exports = TournamentDraw;
