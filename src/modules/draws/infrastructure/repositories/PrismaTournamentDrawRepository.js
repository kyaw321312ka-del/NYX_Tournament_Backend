const HttpError = require('../../../../shared/errors/HttpError');
const TournamentDraw = require('../../domain/entities/TournamentDraw');
const { determineMatchWinner } = require('../../domain/services/MatchScoring');

const registrationInclude = {
    status: { select: { name: true } },
    members: {
        orderBy: { id: 'asc' },
        include: {
            user: { select: { id: true, name: true } },
        },
    },
};

const drawInclude = {
    tournamentCategory: {
        include: {
            eventCategory: {
                select: { categoryCode: true, name: true, pairingType: true },
            },
            tournament: { select: { id: true, title: true } },
        },
    },
    participants: {
        orderBy: { bracketPosition: 'asc' },
        include: { registration: { include: registrationInclude } },
    },
    matches: {
        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
        include: {
            slots: {
                orderBy: { slotNumber: 'asc' },
                include: {
                    participant: {
                        include: { registration: { include: registrationInclude } },
                    },
                },
            },
            winnerParticipant: {
                include: { registration: { include: registrationInclude } },
            },
        },
    },
};

function nextBracketSize(entrantCount) {
    return 2 ** Math.ceil(Math.log2(entrantCount));
}

async function advanceResolvedMatches(transaction, drawId) {
    const draw = await transaction.tournamentDraw.findUnique({
        where: { id: drawId },
        select: { configurationSnapshot: true },
    });
    const bracketSize = draw?.configurationSnapshot?.bracketSize;
    const thirdPlaceRound = draw?.configurationSnapshot?.thirdPlaceMatch === true
        && Number.isInteger(bracketSize)
        ? Math.log2(bracketSize) + 1
        : null;
    const matches = await transaction.tournamentDrawMatch.findMany({
        where: { drawId },
        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
        include: { slots: { orderBy: { slotNumber: 'asc' } } },
    });
    const outcomes = new Map();

    for (const match of matches) {
        let unresolvedSource = false;
        const participants = [];
        for (const slot of match.slots) {
            let participantId = slot.participantId;
            if (slot.sourceMatchId !== null) {
                const source = outcomes.get(slot.sourceMatchId);
                if (!source || !source.resolved) {
                    unresolvedSource = true;
                    continue;
                }
                participantId = match.roundNumber === thirdPlaceRound
                    ? source.loserParticipantId
                    : source.winnerParticipantId;
            }
            if (slot.participantId !== participantId) {
                await transaction.tournamentDrawMatchSlot.update({
                    where: { id: slot.id },
                    data: { participantId },
                });
            }
            if (participantId !== null) participants.push(participantId);
        }

        let status = match.status;
        let winnerParticipantId = match.winnerParticipantId;
        if (match.status === 'PENDING' && !unresolvedSource) {
            winnerParticipantId = null;
            if (participants.length === 0) {
                status = 'EMPTY';
            } else if (participants.length === 1) {
                status = 'BYE';
                winnerParticipantId = participants[0];
            }
        }
        if (status !== match.status || winnerParticipantId !== match.winnerParticipantId) {
            await transaction.tournamentDrawMatch.update({
                where: { id: match.id },
                data: { status, winnerParticipantId },
            });
        }
        outcomes.set(match.id, {
            resolved: status !== 'PENDING',
            winnerParticipantId: status === 'EMPTY' ? null : winnerParticipantId,
            loserParticipantId: status === 'COMPLETED'
                ? match.slots.find(({ participantId: slotParticipantId }) => (
                    slotParticipantId !== null && slotParticipantId !== winnerParticipantId
                ))?.participantId ?? null
                : null,
        });
    }
}

class PrismaTournamentDrawRepository {
    constructor(prisma, generator) {
        this.prisma = prisma;
        this.generator = generator;
    }

    listConfigurationOptions() {
        return {
            drawFormats: ['SINGLE_ELIMINATION'],
            seedingMethods: ['MANUAL'],
            defaults: {
                drawFormat: 'SINGLE_ELIMINATION',
                seedingMethod: 'MANUAL',
                thirdPlaceMatch: false,
            },
        };
    }

    async getDrawConfiguration(tournamentCategoryId) {
        const categoryId = Number(tournamentCategoryId);
        const category = await this.prisma.tournamentCategory.findUnique({
            where: { id: categoryId },
            select: {
                id: true,
                drawConfiguration: true,
            },
        });
        if (!category) {
            throw new HttpError(404, 'Tournament category not found.');
        }
        return category.drawConfiguration ?? {
            tournamentCategoryId: categoryId,
            drawFormat: 'SINGLE_ELIMINATION',
            seedingMethod: 'MANUAL',
            groupCount: null,
            qualifiersPerGroup: null,
            thirdPlaceMatch: false,
        };
    }

    async listDrawConfigurations() {
        return this.prisma.tournamentDrawConfiguration.findMany({
            orderBy: [{ tournamentCategoryId: 'asc' }, { id: 'asc' }],
            include: {
                tournamentCategory: {
                    select: {
                        id: true,
                        tournament: { select: { id: true, title: true } },
                        eventCategory: {
                            select: { categoryCode: true, name: true, pairingType: true },
                        },
                        ageGroup: { select: { id: true, name: true, age: true } },
                    },
                },
            },
        });
    }

    async listEligibleRegistrations(tournamentCategoryId) {
        const categoryId = Number(tournamentCategoryId);
        const category = await this.prisma.tournamentCategory.findUnique({
            where: { id: categoryId },
            select: { id: true },
        });
        if (!category) {
            throw new HttpError(404, 'Tournament category not found.');
        }

        const registrations = await this.prisma.tournamentRegistration.findMany({
            where: {
                tournamentCategoryId: categoryId,
                status: { is: { name: 'confirmed' } },
            },
            orderBy: { registeredAt: 'asc' },
            include: registrationInclude,
        });

        return registrations.map((registration) => ({
            id: registration.id,
            registeredAt: registration.registeredAt,
            members: registration.members.map(({ user }) => ({
                id: user.id,
                name: user.name,
            })),
        }));
    }

    async createDraft(tournamentCategoryId, configuration) {
        const categoryId = Number(tournamentCategoryId);

        return this.prisma.$transaction(async (transaction) => {
            const categoryRows = await transaction.$queryRaw`
                SELECT id FROM tournament_categories WHERE id = ${categoryId} FOR UPDATE
            `;
            if (!categoryRows.length) {
                throw new HttpError(404, 'Tournament category not found.');
            }

            const eligibleRegistrations = await transaction.tournamentRegistration.findMany({
                where: {
                    tournamentCategoryId: categoryId,
                    status: { is: { name: 'confirmed' } },
                },
                select: { id: true },
                orderBy: { id: 'asc' },
            });
            if (eligibleRegistrations.length < 2) {
                throw new HttpError(409, 'At least two confirmed registrations are required to create a draw.');
            }
            const category = await transaction.tournamentCategory.findUnique({
                where: { id: categoryId },
                select: {
                    pointsToWin: true,
                    winningMargin: true,
                    maxPoints: true,
                    gamesToWin: true,
                    drawConfiguration: {
                        select: {
                            drawFormat: true,
                            seedingMethod: true,
                            groupCount: true,
                            qualifiersPerGroup: true,
                            thirdPlaceMatch: true,
                        },
                    },
                    pointTiers: {
                        orderBy: { position: 'asc' },
                        select: { position: true, label: true, points: true },
                    },
                },
            });
            if (!category) {
                throw new HttpError(404, 'Tournament category not found.');
            }
            if (
                category.pointsToWin < 1
                || category.winningMargin < 1
                || category.maxPoints < category.pointsToWin
                || category.winningMargin > category.maxPoints
                || category.gamesToWin < 1
                || category.gamesToWin > 5
            ) {
                throw new HttpError(409, 'Tournament category scoring rules are invalid.');
            }

            const bracketSize = nextBracketSize(eligibleRegistrations.length);
            const storedConfiguration = category.drawConfiguration;
            const drawConfiguration = {
                drawFormat: configuration?.drawFormat
                    ?? storedConfiguration?.drawFormat
                    ?? 'SINGLE_ELIMINATION',
                seedingMethod: configuration?.seedingMethod
                    ?? storedConfiguration?.seedingMethod
                    ?? 'MANUAL',
                groupCount: storedConfiguration?.groupCount ?? null,
                qualifiersPerGroup: storedConfiguration?.qualifiersPerGroup ?? null,
                thirdPlaceMatch: storedConfiguration?.thirdPlaceMatch === true,
            };
            const latest = await transaction.tournamentDraw.findFirst({
                where: { tournamentCategoryId: categoryId },
                orderBy: { version: 'desc' },
                select: { version: true },
            });
            const version = (latest?.version ?? 0) + 1;
            const now = new Date();

            await transaction.tournamentDraw.updateMany({
                where: {
                    tournamentCategoryId: categoryId,
                    status: 'DRAFT',
                },
                data: { status: 'ARCHIVED' },
            });
            await transaction.tournamentDrawConfiguration.upsert({
                where: { tournamentCategoryId: categoryId },
                create: {
                    tournamentCategoryId: categoryId,
                    drawFormat: drawConfiguration.drawFormat,
                    seedingMethod: drawConfiguration.seedingMethod,
                    groupCount: drawConfiguration.groupCount,
                    qualifiersPerGroup: drawConfiguration.qualifiersPerGroup,
                    thirdPlaceMatch: drawConfiguration.thirdPlaceMatch,
                },
                update: {
                    drawFormat: drawConfiguration.drawFormat,
                    seedingMethod: drawConfiguration.seedingMethod,
                    groupCount: drawConfiguration.groupCount,
                    qualifiersPerGroup: drawConfiguration.qualifiersPerGroup,
                    thirdPlaceMatch: drawConfiguration.thirdPlaceMatch,
                },
            });

            const structure = this.generator.generate(bracketSize, {
                thirdPlaceMatch: drawConfiguration.thirdPlaceMatch === true,
            });
            const assignmentPositions = structure.positions.filter(({ assignable }) => assignable);
            const draw = await transaction.tournamentDraw.create({
                data: {
                    tournamentCategoryId: categoryId,
                    version,
                    configurationSnapshot: {
                        ...drawConfiguration,
                        bracketSize,
                        thirdPlaceMatch: drawConfiguration.thirdPlaceMatch === true,
                        positionCount: structure.positions.length,
                        expectedMatchCount: structure.matches.length,
                        positions: structure.positions,
                        assignmentPositions,
                        scoringRules: {
                            pointsToWin: category.pointsToWin,
                            winningMargin: category.winningMargin,
                            maxPoints: category.maxPoints,
                            gamesToWin: category.gamesToWin,
                        },
                        pointTiers: category.pointTiers,
                        eligibleRegistrationIds: eligibleRegistrations.map(({ id }) => id),
                    },
                },
                select: { id: true },
            });

            const matchIds = new Map();
            for (const plannedMatch of structure.matches) {
                const match = await transaction.tournamentDrawMatch.create({
                    data: {
                        drawId: draw.id,
                        roundNumber: plannedMatch.roundNumber,
                        matchNumber: plannedMatch.matchNumber,
                    },
                    select: { id: true },
                });
                matchIds.set(plannedMatch.key, match.id);
            }
            for (const plannedMatch of structure.matches) {
                await transaction.tournamentDrawMatchSlot.createMany({
                    data: plannedMatch.slots.map((slot) => ({
                        drawId: draw.id,
                        matchId: matchIds.get(plannedMatch.key),
                        slotNumber: slot.slotNumber,
                        bracketPosition: slot.bracketPosition ?? null,
                        sourceMatchId: slot.sourceMatchKey
                            ? matchIds.get(slot.sourceMatchKey)
                            : null,
                        createdAt: now,
                        updatedAt: now,
                    })),
                });
            }

            return this.getDrawRecord(transaction, draw.id);
        }, { isolationLevel: 'Serializable' }).then(TournamentDraw.fromRecord);
    }

    async getLatestDraw(tournamentCategoryId) {
        const draw = await this.prisma.tournamentDraw.findFirst({
            where: { tournamentCategoryId: Number(tournamentCategoryId) },
            orderBy: { version: 'desc' },
            include: drawInclude,
        });
        if (!draw) {
            throw new HttpError(404, 'No draw has been created for this tournament category.');
        }
        return TournamentDraw.fromRecord(draw);
    }

    async getDraw(tournamentCategoryId, drawId) {
        const draw = await this.prisma.tournamentDraw.findFirst({
            where: {
                id: Number(drawId),
                tournamentCategoryId: Number(tournamentCategoryId),
            },
            include: drawInclude,
        });
        if (!draw) {
            throw new HttpError(404, 'Tournament draw not found.');
        }
        return TournamentDraw.fromRecord(draw);
    }

    async getPublishedDraw(tournamentCategoryId) {
        const draw = await this.prisma.tournamentDraw.findFirst({
            where: {
                tournamentCategoryId: Number(tournamentCategoryId),
                status: 'PUBLISHED',
            },
            orderBy: { version: 'desc' },
            include: drawInclude,
        });
        if (!draw) {
            throw new HttpError(404, 'No published draw was found for this tournament category.');
        }
        return TournamentDraw.fromRecord(draw);
    }

    async listRankingPointAwards(tournamentCategoryId) {
        const categoryId = Number(tournamentCategoryId);
        const category = await this.prisma.tournamentCategory.findUnique({
            where: { id: categoryId },
            select: { id: true },
        });
        if (!category) {
            throw new HttpError(404, 'Tournament category not found.');
        }

        const awards = await this.prisma.tournamentRankingPointAward.findMany({
            where: { tournamentCategoryId: categoryId },
            orderBy: [{ awardedAt: 'asc' }, { id: 'asc' }],
            include: {
                user: { select: { id: true, name: true } },
                draw: { select: { id: true, version: true } },
            },
        });
        return awards.map((award) => ({
            id: award.id,
            tournamentCategoryId: award.tournamentCategoryId,
            drawId: award.drawId,
            drawVersion: award.draw.version,
            registrationId: award.registrationId,
            player: award.user,
            position: award.position,
            label: award.label,
            points: award.points,
            awardedAt: award.awardedAt,
        }));
    }

    async assignPositions(drawId, assignments) {
        const id = Number(drawId);
        return this.prisma.$transaction(async (transaction) => {
            const drawRows = await transaction.$queryRaw`
                SELECT id FROM tournament_draws WHERE id = ${id} FOR UPDATE
            `;
            if (!drawRows.length) {
                throw new HttpError(404, 'Tournament draw not found.');
            }

            const draw = await transaction.tournamentDraw.findUnique({
                where: { id },
                select: {
                    id: true,
                    tournamentCategoryId: true,
                    status: true,
                    configurationSnapshot: true,
                },
            });
            if (draw.status !== 'DRAFT') {
                throw new HttpError(409, 'Only draft draws can be changed.');
            }

            const bracketSize = draw.configurationSnapshot.bracketSize;
            const eligibleIds = draw.configurationSnapshot.eligibleRegistrationIds;
            const assignmentPositions = draw.configurationSnapshot.assignmentPositions
                ?? (Number.isInteger(bracketSize)
                    ? Array.from({ length: bracketSize }, (_, index) => ({
                        bracketPosition: index + 1,
                        assignable: true,
                    }))
                    : null);
            if (!Number.isInteger(draw.configurationSnapshot.positionCount) || !Array.isArray(eligibleIds)
                || !Array.isArray(assignmentPositions)) {
                throw new HttpError(409, 'This draw draft is outdated. Create a new draft before assigning positions.');
            }
            const positionByNumber = new Map(assignmentPositions.map((position) => [
                position.bracketPosition,
                position,
            ]));
            const positions = new Set();
            const registrationIds = new Set();
            for (const assignment of assignments) {
                if (
                    !positionByNumber.has(assignment.bracketPosition)
                    || positions.has(assignment.bracketPosition)
                    || registrationIds.has(assignment.registrationId)
                ) {
                    throw new HttpError(400, 'Each confirmed registration and bracket position can only be assigned once.');
                }
                positions.add(assignment.bracketPosition);
                registrationIds.add(assignment.registrationId);
            }

            const eligibleAtCreation = new Set(eligibleIds);
            if (assignments.some(({ registrationId }) => !eligibleAtCreation.has(registrationId))) {
                throw new HttpError(409, 'A selected registration was not eligible when this draw was created. Create a new draft draw.');
            }

            if (registrationIds.size) {
                const eligibleNow = await transaction.tournamentRegistration.findMany({
                    where: {
                        id: { in: [...registrationIds] },
                        tournamentCategoryId: draw.tournamentCategoryId,
                        status: { is: { name: 'confirmed' } },
                    },
                    select: { id: true },
                });
                if (eligibleNow.length !== registrationIds.size) {
                    throw new HttpError(409, 'Only confirmed registrations in this tournament category can be assigned.');
                }
            }

            await transaction.tournamentDrawMatchSlot.updateMany({
                where: { drawId: id },
                data: { participantId: null },
            });
            await transaction.tournamentDrawParticipant.deleteMany({
                where: { drawId: id },
            });
            if (assignments.length) {
                await transaction.tournamentDrawParticipant.createMany({
                    data: assignments.map(({ registrationId, bracketPosition }) => ({
                        drawId: id,
                        tournamentCategoryId: draw.tournamentCategoryId,
                        registrationId,
                        bracketPosition,
                    })),
                });

                const participants = await transaction.tournamentDrawParticipant.findMany({
                    where: { drawId: id },
                    select: { id: true, bracketPosition: true },
                });
                for (const participant of participants) {
                    await transaction.tournamentDrawMatchSlot.updateMany({
                        where: {
                            drawId: id,
                            bracketPosition: participant.bracketPosition,
                        },
                        data: { participantId: participant.id },
                    });
                }
            }

            return this.getDrawRecord(transaction, id);
        }, { isolationLevel: 'Serializable' }).then(TournamentDraw.fromRecord);
    }

    async publish(drawId) {
        const id = Number(drawId);
        return this.prisma.$transaction(async (transaction) => {
            const drawRows = await transaction.$queryRaw`
                SELECT id FROM tournament_draws WHERE id = ${id} FOR UPDATE
            `;
            if (!drawRows.length) {
                throw new HttpError(404, 'Tournament draw not found.');
            }

            const draw = await transaction.tournamentDraw.findUnique({
                where: { id },
                include: {
                    participants: { select: { id: true, registrationId: true } },
                    matches: {
                        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
                        include: {
                            slots: { orderBy: { slotNumber: 'asc' } },
                        },
                    },
                },
            });
            if (draw.status !== 'DRAFT') {
                throw new HttpError(409, 'Only draft draws can be published.');
            }
            const bracketSize = draw.configurationSnapshot.bracketSize;
            if (
                !Number.isInteger(draw.configurationSnapshot.expectedMatchCount)
                || draw.matches.length !== draw.configurationSnapshot.expectedMatchCount
                || draw.matches.some(({ slots }) => slots.length !== 2)
            ) {
                throw new HttpError(409, 'This draw does not have a complete bracket structure. Create a new draft.');
            }
            if (draw.participants.length < 2) {
                throw new HttpError(400, 'Assign at least two confirmed registrations before publishing the draw.');
            }
            const confirmed = await transaction.tournamentRegistration.findMany({
                where: {
                    id: { in: draw.participants.map(({ registrationId }) => registrationId) },
                    tournamentCategoryId: draw.tournamentCategoryId,
                    status: { is: { name: 'confirmed' } },
                },
                select: { id: true },
            });
            if (confirmed.length !== draw.participants.length) {
                throw new HttpError(409, 'All assigned registrations must remain confirmed before publishing.');
            }

            const thirdPlaceRound = draw.configurationSnapshot.thirdPlaceMatch === true
                && Number.isInteger(bracketSize)
                ? Math.log2(bracketSize) + 1
                : null;
            const outcomes = new Map();
            for (const match of draw.matches) {
                let unresolved = false;
                const slotParticipants = [];
                const slotUpdates = [];
                for (const slot of match.slots) {
                    let participantId = slot.participantId;
                    if (slot.sourceMatchId !== null) {
                        const source = outcomes.get(slot.sourceMatchId);
                        if (!source || !source.resolved) {
                            unresolved = true;
                            continue;
                        }
                        participantId = match.roundNumber === thirdPlaceRound
                            ? source.loserParticipantId
                            : source.winnerParticipantId;
                    }
                    if (participantId !== null) {
                        slotParticipants.push(participantId);
                        if (slot.participantId !== participantId) {
                            slotUpdates.push({ id: slot.id, participantId });
                        }
                    }
                }

                let status = 'PENDING';
                let winnerParticipantId = null;
                let resolved = false;
                if (!unresolved) {
                    if (slotParticipants.length === 0) {
                        status = 'EMPTY';
                        resolved = true;
                    } else if (slotParticipants.length === 1) {
                        status = 'BYE';
                        winnerParticipantId = slotParticipants[0];
                        resolved = true;
                    }
                }

                for (const slot of slotUpdates) {
                    await transaction.tournamentDrawMatchSlot.update({
                        where: { id: slot.id },
                        data: { participantId: slot.participantId },
                    });
                }
                await transaction.tournamentDrawMatch.update({
                    where: { id: match.id },
                    data: { status, winnerParticipantId },
                });
                outcomes.set(match.id, {
                    resolved,
                    winnerParticipantId,
                    loserParticipantId: null,
                });
            }

            await transaction.tournamentDraw.updateMany({
                where: {
                    tournamentCategoryId: draw.tournamentCategoryId,
                    status: 'PUBLISHED',
                },
                data: { status: 'ARCHIVED' },
            });
            await transaction.tournamentDraw.update({
                where: { id },
                data: {
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                },
            });

            return this.getDrawRecord(transaction, id);
        }, { isolationLevel: 'Serializable' }).then(TournamentDraw.fromRecord);
    }

    async recordMatchResult(drawId, matchId, games) {
        const id = Number(drawId);
        const matchRecordId = Number(matchId);
        return this.prisma.$transaction(async (transaction) => {
            const drawRows = await transaction.$queryRaw`
                SELECT id FROM tournament_draws WHERE id = ${id} FOR UPDATE
            `;
            if (!drawRows.length) {
                throw new HttpError(404, 'Tournament draw not found.');
            }

            const draw = await transaction.tournamentDraw.findUnique({
                where: { id },
                select: {
                    id: true,
                    status: true,
                    finalizedAt: true,
                    configurationSnapshot: true,
                },
            });
            if (draw.status !== 'PUBLISHED') {
                throw new HttpError(409, 'Match results can only be recorded for a published draw.');
            }
            if (draw.finalizedAt) {
                throw new HttpError(409, 'Results have been finalized and can no longer be changed.');
            }

            const match = await transaction.tournamentDrawMatch.findFirst({
                where: { id: matchRecordId, drawId: id },
                include: { slots: { orderBy: { slotNumber: 'asc' } } },
            });
            if (!match) {
                throw new HttpError(404, 'Tournament draw match not found.');
            }
            if (match.status !== 'PENDING') {
                throw new HttpError(409, 'Only pending matches can receive results.');
            }
            if (match.slots.length !== 2 || match.slots.some(({ participantId }) => participantId === null)) {
                throw new HttpError(409, 'Both match positions must have assigned participants before recording a result.');
            }

            const scoringRules = draw.configurationSnapshot.scoringRules;
            if (!scoringRules) {
                throw new HttpError(409, 'This draw has no scoring-rule snapshot. Create a new draft before recording results.');
            }
            let winnerNumber;
            try {
                winnerNumber = determineMatchWinner(games, scoringRules);
            } catch (error) {
                if (error instanceof RangeError) {
                    throw new HttpError(400, error.message);
                }
                throw error;
            }
            const winnerParticipantId = match.slots[winnerNumber - 1].participantId;
            await transaction.tournamentDrawMatch.update({
                where: { id: match.id },
                data: {
                    status: 'COMPLETED',
                    result: { games },
                    winnerParticipantId,
                },
            });
            await advanceResolvedMatches(transaction, id);

            return this.getDrawRecord(transaction, id);
        }, { isolationLevel: 'Serializable' }).then(TournamentDraw.fromRecord);
    }

    async finalizeResults(drawId) {
        const id = Number(drawId);
        return this.prisma.$transaction(async (transaction) => {
            const drawRows = await transaction.$queryRaw`
                SELECT id FROM tournament_draws WHERE id = ${id} FOR UPDATE
            `;
            if (!drawRows.length) {
                throw new HttpError(404, 'Tournament draw not found.');
            }

            const draw = await transaction.tournamentDraw.findUnique({
                where: { id },
                include: {
                    participants: {
                        include: {
                            registration: {
                                include: { members: { select: { userId: true } } },
                            },
                        },
                    },
                    matches: {
                        orderBy: [{ roundNumber: 'asc' }, { matchNumber: 'asc' }],
                        include: { slots: { orderBy: { slotNumber: 'asc' } } },
                    },
                },
            });
            if (draw.status !== 'PUBLISHED') {
                throw new HttpError(409, 'Only published draws can be finalized.');
            }
            if (draw.finalizedAt) {
                throw new HttpError(409, 'Tournament results have already been finalized.');
            }
            if (draw.matches.some(({ status }) => status === 'PENDING')) {
                throw new HttpError(409, 'Every playable match must be completed before finalizing results.');
            }

            const bracketSize = draw.configurationSnapshot.bracketSize;
            const thirdPlaceEnabled = draw.configurationSnapshot.thirdPlaceMatch === true;
            const finalRound = Number.isInteger(bracketSize)
                ? Math.log2(bracketSize)
                : null;
            const finalMatch = draw.matches.find((match) => (
                finalRound !== null
                && match.roundNumber === finalRound
                && match.matchNumber === 1
            )) ?? draw.matches.reduce((latest, match) => (
                thirdPlaceEnabled && match.roundNumber > finalRound
                    ? latest
                    : (!latest || match.roundNumber > latest.roundNumber ? match : latest)
            ), null);
            if (!finalMatch?.winnerParticipantId) {
                throw new HttpError(409, 'The final bracket position has no determined winner.');
            }
            if (!Number.isInteger(bracketSize) || bracketSize < 2) {
                throw new HttpError(409, 'This draw has no valid bracket size and cannot be finalized.');
            }

            const placements = new Map([[finalMatch.winnerParticipantId, 1]]);
            let runnerUpParticipantId = finalMatch.status === 'COMPLETED'
                ? finalMatch.slots.find(
                    ({ participantId }) => participantId !== null
                        && participantId !== finalMatch.winnerParticipantId,
                )?.participantId ?? null
                : null;
            if (finalMatch.status === 'BYE') {
                const lastDefeatedMatch = draw.matches
                    .filter((match) => (
                        match.status === 'COMPLETED'
                        && match.winnerParticipantId === finalMatch.winnerParticipantId
                    ))
                    .sort((left, right) => right.roundNumber - left.roundNumber)[0];
                runnerUpParticipantId = lastDefeatedMatch?.slots.find(
                    ({ participantId }) => participantId !== null
                        && participantId !== finalMatch.winnerParticipantId,
                )?.participantId ?? null;
            }
            if (runnerUpParticipantId !== null) {
                placements.set(runnerUpParticipantId, 2);
            }

            if (thirdPlaceEnabled && bracketSize >= 4) {
                const thirdPlaceMatch = draw.matches.find((match) => (
                    finalRound !== null
                    && match.roundNumber === finalRound + 1
                    && match.matchNumber === 1
                ));
                if (!thirdPlaceMatch || thirdPlaceMatch.status === 'PENDING') {
                    throw new HttpError(409, 'The third-place match must be completed before finalizing results.');
                }
                if (thirdPlaceMatch.status === 'COMPLETED' && thirdPlaceMatch.winnerParticipantId) {
                    placements.set(thirdPlaceMatch.winnerParticipantId, 3);
                    const thirdPlaceLoser = thirdPlaceMatch.slots.find(
                        ({ participantId }) => participantId !== null
                            && participantId !== thirdPlaceMatch.winnerParticipantId,
                    )?.participantId ?? null;
                    if (thirdPlaceLoser !== null) {
                        placements.set(thirdPlaceLoser, 4);
                    }
                } else if (thirdPlaceMatch.status === 'BYE' && thirdPlaceMatch.winnerParticipantId) {
                    placements.set(thirdPlaceMatch.winnerParticipantId, 3);
                }
            }

            for (const match of draw.matches) {
                if (thirdPlaceEnabled && finalRound !== null && match.roundNumber === finalRound + 1) {
                    continue;
                }
                if (match.status !== 'COMPLETED' || !match.winnerParticipantId) continue;
                const loser = match.slots.find(
                    ({ participantId }) => participantId !== null && participantId !== match.winnerParticipantId,
                );
                if (!loser) continue;
                if (loser.participantId === runnerUpParticipantId) continue;
                if (placements.has(loser.participantId)) continue;
                const position = Math.floor(bracketSize / (2 ** match.roundNumber)) + 1;
                placements.set(loser.participantId, position);
            }

            const participantById = new Map(draw.participants.map((participant) => [
                participant.id,
                participant,
            ]));
            const pointTiers = draw.configurationSnapshot.pointTiers ?? [];
            const awardRows = [];
            const awardedUserIds = new Set();
            for (const [participantId, position] of placements) {
                const participant = participantById.get(participantId);
                const pointTier = pointTiers.find((tier) => tier.position === position);
                if (!participant || !pointTier) continue;
                for (const member of participant.registration.members) {
                    if (awardedUserIds.has(member.userId)) {
                        throw new HttpError(409, 'A player cannot receive multiple awards in the same tournament category.');
                    }
                    awardedUserIds.add(member.userId);
                    awardRows.push({
                        tournamentCategoryId: draw.tournamentCategoryId,
                        drawId: draw.id,
                        registrationId: participant.registrationId,
                        userId: member.userId,
                        position,
                        label: pointTier.label,
                        points: pointTier.points,
                    });
                }
            }

            if (awardRows.length) {
                const userIds = [...new Set(awardRows.map(({ userId }) => userId))];
                const priorAwards = await transaction.tournamentRankingPointAward.findMany({
                    where: {
                        tournamentCategoryId: draw.tournamentCategoryId,
                        userId: { in: userIds },
                    },
                    select: { userId: true },
                });
                if (priorAwards.length) {
                    throw new HttpError(409, 'One or more players already received ranking points for this category.');
                }
                try {
                    await transaction.tournamentRankingPointAward.createMany({ data: awardRows });
                } catch (error) {
                    if (error.code === 'P2002') {
                        throw new HttpError(409, 'One or more players already received ranking points for this category.');
                    }
                    throw error;
                }
            }

            await transaction.tournamentDraw.update({
                where: { id },
                data: { finalizedAt: new Date() },
            });
            const rankingPointAwards = await transaction.tournamentRankingPointAward.findMany({
                where: { drawId: id },
                orderBy: [{ position: 'asc' }, { userId: 'asc' }],
                include: { user: { select: { id: true, name: true } } },
            });

            return {
                draw: TournamentDraw.fromRecord(await this.getDrawRecord(transaction, id)),
                rankingPointAwards,
            };
        }, { isolationLevel: 'Serializable' });
    }

    getDrawRecord(database, drawId) {
        return database.tournamentDraw.findUnique({
            where: { id: Number(drawId) },
            include: drawInclude,
        });
    }
}

module.exports = PrismaTournamentDrawRepository;
