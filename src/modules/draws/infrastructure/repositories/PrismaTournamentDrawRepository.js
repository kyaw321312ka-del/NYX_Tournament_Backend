const HttpError = require('../../../../shared/errors/HttpError');
const TournamentDraw = require('../../domain/entities/TournamentDraw');

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

class PrismaTournamentDrawRepository {
    constructor(prisma, generator) {
        this.prisma = prisma;
        this.generator = generator;
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

            const bracketSize = nextBracketSize(eligibleRegistrations.length);
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
                    drawFormat: configuration.drawFormat,
                    seedingMethod: configuration.seedingMethod,
                },
                update: {
                    drawFormat: configuration.drawFormat,
                    seedingMethod: configuration.seedingMethod,
                },
            });

            const draw = await transaction.tournamentDraw.create({
                data: {
                    tournamentCategoryId: categoryId,
                    version,
                    configurationSnapshot: {
                        ...configuration,
                        bracketSize,
                        eligibleRegistrationIds: eligibleRegistrations.map(({ id }) => id),
                    },
                },
                select: { id: true },
            });

            const rounds = this.generator.generate(bracketSize);
            const matchIdsByRound = new Map();
            for (const round of rounds) {
                const matchIds = new Map();
                for (const plannedMatch of round) {
                    const match = await transaction.tournamentDrawMatch.create({
                        data: {
                            drawId: draw.id,
                            roundNumber: plannedMatch.roundNumber,
                            matchNumber: plannedMatch.matchNumber,
                        },
                        select: { id: true },
                    });
                    matchIds.set(plannedMatch.matchNumber, match.id);

                    await transaction.tournamentDrawMatchSlot.createMany({
                        data: plannedMatch.slots.map((slot) => ({
                            drawId: draw.id,
                            matchId: match.id,
                            slotNumber: slot.slotNumber,
                            bracketPosition: slot.bracketPosition ?? null,
                            sourceMatchId: slot.sourceMatchNumber
                                ? matchIdsByRound.get(plannedMatch.roundNumber - 1)?.get(slot.sourceMatchNumber)
                                : null,
                            createdAt: now,
                            updatedAt: now,
                        })),
                    });
                }
                matchIdsByRound.set(round[0].roundNumber, matchIds);
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
            if (!Number.isInteger(bracketSize) || !Array.isArray(eligibleIds)) {
                throw new HttpError(409, 'This draw draft is outdated. Create a new draft before assigning positions.');
            }
            const positions = new Set();
            const registrationIds = new Set();
            for (const assignment of assignments) {
                if (
                    assignment.bracketPosition < 1
                    || assignment.bracketPosition > bracketSize
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
                !Number.isInteger(bracketSize)
                || draw.matches.length !== bracketSize - 1
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
                        participantId = source.winnerParticipantId;
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
                outcomes.set(match.id, { resolved, winnerParticipantId });
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

    getDrawRecord(database, drawId) {
        return database.tournamentDraw.findUnique({
            where: { id: Number(drawId) },
            include: drawInclude,
        });
    }
}

module.exports = PrismaTournamentDrawRepository;
