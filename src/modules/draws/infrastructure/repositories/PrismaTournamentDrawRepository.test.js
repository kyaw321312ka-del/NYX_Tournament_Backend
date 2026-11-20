const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaTournamentDrawRepository = require('./PrismaTournamentDrawRepository');
const SingleEliminationGenerator = require('../../domain/services/SingleEliminationGenerator');

test('creates a power-of-two draft with open positions and match feeders', async () => {
    const calls = { matches: [], slots: [] };
    const record = {
        id: 10,
        tournamentCategoryId: 3,
        version: 1,
        status: 'DRAFT',
        configurationSnapshot: { drawFormat: 'SINGLE_ELIMINATION', bracketSize: 4 },
        participants: [],
        matches: [],
    };
    const transaction = {
        $queryRaw: async () => [{ id: 3 }],
        tournamentRegistration: {
            findMany: async () => [{ id: 11 }, { id: 12 }, { id: 13 }],
        },
        tournamentCategory: {
            findUnique: async () => ({
                pointsToWin: 21,
                winningMargin: 2,
                maxPoints: 30,
                gamesToWin: 2,
                pointTiers: [
                    { position: 1, label: 'Champion', points: 300 },
                    { position: 2, label: 'Runner-up', points: 200 },
                ],
            }),
        },
        tournamentCategory: {
            findUnique: async () => ({
                pointsToWin: 21,
                winningMargin: 2,
                maxPoints: 30,
                gamesToWin: 2,
                pointTiers: [
                    { position: 1, label: 'Champion', points: 300 },
                    { position: 2, label: 'Runner-up', points: 200 },
                ],
            }),
        },
        tournamentDraw: {
            findFirst: async () => null,
            updateMany: async () => ({ count: 0 }),
            create: async ({ data }) => {
                calls.drawData = data;
                return { id: 10 };
            },
            findUnique: async () => record,
        },
        tournamentDrawConfiguration: {
            upsert: async (args) => {
                calls.configuration = args;
                return {};
            },
        },
        tournamentDrawMatch: {
            create: async ({ data }) => {
                const match = { id: calls.matches.length + 100, ...data };
                calls.matches.push(match);
                return { id: match.id };
            },
        },
        tournamentDrawMatchSlot: {
            createMany: async ({ data }) => {
                calls.slots.push(...data);
                return { count: data.length };
            },
        },
    };
    const repository = new PrismaTournamentDrawRepository(
        { $transaction: (callback) => callback(transaction) },
        new SingleEliminationGenerator(),
    );

    const draw = await repository.createDraft(3, {
        drawFormat: 'SINGLE_ELIMINATION',
        seedingMethod: 'MANUAL',
    });

    assert.equal(draw.status, 'DRAFT');
    assert.equal(calls.drawData.configurationSnapshot.bracketSize, 4);
    assert.deepEqual(calls.drawData.configurationSnapshot.eligibleRegistrationIds, [11, 12, 13]);
    assert.equal(calls.drawData.configurationSnapshot.expectedMatchCount, 3);
    assert.deepEqual(calls.drawData.configurationSnapshot.scoringRules, {
        pointsToWin: 21,
        winningMargin: 2,
        maxPoints: 30,
        gamesToWin: 2,
    });
    assert.deepEqual(calls.drawData.configurationSnapshot.pointTiers, [
        { position: 1, label: 'Champion', points: 300 },
        { position: 2, label: 'Runner-up', points: 200 },
    ]);
    assert.equal(calls.matches.length, 3);
    assert.equal(calls.slots.length, 6);
    assert.deepEqual(calls.slots.slice(0, 2).map(({ bracketPosition }) => bracketPosition), [1, 2]);
    assert.deepEqual(calls.slots.slice(4).map(({ sourceMatchId }) => sourceMatchId), [100, 101]);
    assert.equal(calls.configuration.update.drawFormat, 'SINGLE_ELIMINATION');
});

test('publishes the assigned draw and propagates bye winners to the final', async () => {
    const participants = [
        { id: 21, registrationId: 31 },
        { id: 22, registrationId: 32 },
    ];
    const matches = [
        {
            id: 101,
            roundNumber: 1,
            matchNumber: 1,
            slots: [
                { id: 1001, slotNumber: 1, participantId: 21, sourceMatchId: null },
                { id: 1002, slotNumber: 2, participantId: null, sourceMatchId: null },
            ],
        },
        {
            id: 102,
            roundNumber: 1,
            matchNumber: 2,
            slots: [
                { id: 1003, slotNumber: 1, participantId: 22, sourceMatchId: null },
                { id: 1004, slotNumber: 2, participantId: null, sourceMatchId: null },
            ],
        },
        {
            id: 103,
            roundNumber: 2,
            matchNumber: 1,
            slots: [
                { id: 1005, slotNumber: 1, participantId: null, sourceMatchId: 101 },
                { id: 1006, slotNumber: 2, participantId: null, sourceMatchId: 102 },
            ],
        },
    ];
    const calls = { matches: [], slots: [], drawUpdates: [] };
    let drawReadCount = 0;
    const finalRecord = {
        id: 10,
        tournamentCategoryId: 3,
        version: 1,
        status: 'PUBLISHED',
        participants: [],
        matches: [],
    };
    const transaction = {
        $queryRaw: async () => [{ id: 10 }],
        tournamentDraw: {
            findUnique: async () => {
                drawReadCount += 1;
                return drawReadCount === 1
                    ? {
                        id: 10,
                        tournamentCategoryId: 3,
                        status: 'DRAFT',
                        configurationSnapshot: { bracketSize: 4, expectedMatchCount: 3 },
                        participants,
                        matches,
                    }
                    : finalRecord;
            },
            updateMany: async (args) => {
                calls.drawUpdates.push(['archive', args]);
                return { count: 0 };
            },
            update: async (args) => {
                calls.drawUpdates.push(['publish', args]);
                return finalRecord;
            },
        },
        tournamentRegistration: {
            findMany: async () => [{ id: 31 }, { id: 32 }],
        },
        tournamentDrawMatch: {
            update: async (args) => calls.matches.push(args),
        },
        tournamentDrawMatchSlot: {
            update: async (args) => calls.slots.push(args),
        },
    };
    const repository = new PrismaTournamentDrawRepository(
        { $transaction: (callback) => callback(transaction) },
        new SingleEliminationGenerator(),
    );

    const draw = await repository.publish(10);

    assert.equal(draw.status, 'PUBLISHED');
    assert.deepEqual(calls.matches.map(({ data }) => [data.status, data.winnerParticipantId]), [
        ['BYE', 21],
        ['BYE', 22],
        ['PENDING', null],
    ]);
    assert.deepEqual(calls.slots.map(({ data }) => data.participantId), [21, 22]);
    assert.equal(calls.drawUpdates.at(-1)[1].data.status, 'PUBLISHED');
});

test('replaces draft assignments only with confirmed registrations from its snapshot', async () => {
    const calls = { slotUpdates: [], createdParticipants: [] };
    const finalRecord = {
        id: 10,
        tournamentCategoryId: 3,
        status: 'DRAFT',
        participants: [],
        matches: [],
    };
    const transaction = {
        $queryRaw: async () => [{ id: 10 }],
        tournamentDraw: {
            findUnique: async (args) => (args.select
                ? {
                    id: 10,
                    tournamentCategoryId: 3,
                    status: 'DRAFT',
                    configurationSnapshot: {
                        bracketSize: 4,
                        positionCount: 4,
                        eligibleRegistrationIds: [31, 32, 33],
                        assignmentPositions: [1, 2, 3, 4].map((bracketPosition) => ({
                            bracketPosition,
                            assignable: true,
                        })),
                    },
                }
                : finalRecord),
        },
        tournamentRegistration: {
            findMany: async () => [{ id: 31 }, { id: 32 }],
        },
        tournamentDrawMatchSlot: {
            updateMany: async (args) => calls.slotUpdates.push(args),
        },
        tournamentDrawParticipant: {
            deleteMany: async () => ({ count: 0 }),
            createMany: async ({ data }) => {
                calls.createdParticipants.push(...data);
                return { count: data.length };
            },
            findMany: async () => [
                { id: 41, bracketPosition: 2 },
                { id: 42, bracketPosition: 4 },
            ],
        },
    };
    const repository = new PrismaTournamentDrawRepository(
        { $transaction: (callback) => callback(transaction) },
        new SingleEliminationGenerator(),
    );

    await repository.assignPositions(10, [
        { registrationId: 31, bracketPosition: 2 },
        { registrationId: 32, bracketPosition: 4 },
    ]);

    assert.deepEqual(calls.createdParticipants, [
        { drawId: 10, tournamentCategoryId: 3, registrationId: 31, bracketPosition: 2 },
        { drawId: 10, tournamentCategoryId: 3, registrationId: 32, bracketPosition: 4 },
    ]);
    assert.deepEqual(calls.slotUpdates.slice(1).map(({ where, data }) => [
        where.bracketPosition,
        data.participantId,
    ]), [[2, 41], [4, 42]]);
});

test('rejects duplicate registrations or bracket positions before replacing assignments', async () => {
    let replaced = false;
    const transaction = {
        $queryRaw: async () => [{ id: 10 }],
        tournamentDraw: {
            findUnique: async () => ({
                id: 10,
                status: 'DRAFT',
                configurationSnapshot: {
                    bracketSize: 4,
                    positionCount: 4,
                    eligibleRegistrationIds: [31, 32],
                    assignmentPositions: [1, 2, 3, 4].map((bracketPosition) => ({
                        bracketPosition,
                        assignable: true,
                    })),
                },
            }),
        },
        tournamentDrawMatchSlot: {
            updateMany: async () => { replaced = true; },
        },
    };
    const repository = new PrismaTournamentDrawRepository(
        { $transaction: (callback) => callback(transaction) },
        new SingleEliminationGenerator(),
    );

    await assert.rejects(repository.assignPositions(10, [
        { registrationId: 31, bracketPosition: 1 },
        { registrationId: 31, bracketPosition: 2 },
    ]), { statusCode: 400 });
    assert.equal(replaced, false);
});

test('records valid scores and advances the winner into the next round', async () => {
    const calls = { matchUpdates: [], slotUpdates: [] };
    const matches = [
        {
            id: 91,
            roundNumber: 1,
            matchNumber: 1,
            status: 'PENDING',
            winnerParticipantId: null,
            slots: [
                { id: 901, slotNumber: 1, participantId: 41, sourceMatchId: null },
                { id: 902, slotNumber: 2, participantId: 42, sourceMatchId: null },
            ],
        },
        {
            id: 92,
            roundNumber: 1,
            matchNumber: 2,
            status: 'EMPTY',
            winnerParticipantId: null,
            slots: [
                { id: 903, slotNumber: 1, participantId: null, sourceMatchId: null },
                { id: 904, slotNumber: 2, participantId: null, sourceMatchId: null },
            ],
        },
        {
            id: 93,
            roundNumber: 2,
            matchNumber: 1,
            status: 'PENDING',
            winnerParticipantId: null,
            slots: [
                { id: 905, slotNumber: 1, participantId: null, sourceMatchId: 91 },
                { id: 906, slotNumber: 2, participantId: null, sourceMatchId: 92 },
            ],
        },
    ];
    const drawRecord = {
        id: 10,
        tournamentCategoryId: 3,
        version: 1,
        status: 'PUBLISHED',
        configurationSnapshot: { drawFormat: 'SINGLE_ELIMINATION' },
        participants: [],
        matches: [],
    };
    const transaction = {
        $queryRaw: async () => [{ id: 10 }],
        tournamentDraw: {
            findUnique: async (args) => (args.select
                ? {
                    id: 10,
                    status: 'PUBLISHED',
                    finalizedAt: null,
                    configurationSnapshot: {
                        scoringRules: {
                            pointsToWin: 21,
                            winningMargin: 2,
                            maxPoints: 30,
                            gamesToWin: 2,
                        },
                    },
                }
                : drawRecord),
            update: async () => {},
        },
        tournamentDrawMatch: {
            findFirst: async () => matches[0],
            findMany: async () => matches,
            update: async (args) => {
                calls.matchUpdates.push(args);
                Object.assign(matches.find(({ id }) => id === args.where.id), args.data);
            },
        },
        tournamentDrawMatchSlot: {
            update: async (args) => {
                calls.slotUpdates.push(args);
                for (const match of matches) {
                    const slot = match.slots.find(({ id }) => id === args.where.id);
                    if (slot) Object.assign(slot, args.data);
                }
            },
        },
    };
    const repository = new PrismaTournamentDrawRepository(
        { $transaction: (callback) => callback(transaction) },
        new SingleEliminationGenerator(),
    );

    await repository.recordMatchResult(10, 91, [
        { gameNumber: 1, participant1Score: 21, participant2Score: 17 },
        { gameNumber: 2, participant1Score: 21, participant2Score: 19 },
    ]);

    assert.deepEqual(calls.matchUpdates[0].data, {
        status: 'COMPLETED',
        result: {
            games: [
                { gameNumber: 1, participant1Score: 21, participant2Score: 17 },
                { gameNumber: 2, participant1Score: 21, participant2Score: 19 },
            ],
        },
        winnerParticipantId: 41,
    });
    assert.deepEqual(calls.slotUpdates, [{
        where: { id: 905 },
        data: { participantId: 41 },
    }]);
    assert.deepEqual(calls.matchUpdates[1], {
        where: { id: 93 },
        data: { status: 'BYE', winnerParticipantId: 41 },
    });
});

test('finalizes a completed draw, awards configured points to every doubles member, and records history', async () => {
    const awardCalls = { created: null, finalizedAt: null };
    const draw = {
        id: 10,
        tournamentCategoryId: 3,
        version: 1,
        status: 'PUBLISHED',
        finalizedAt: null,
        configurationSnapshot: {
            bracketSize: 4,
            pointTiers: [
                { position: 1, label: 'Champion', points: 300 },
                { position: 2, label: 'Runner-up', points: 200 },
                { position: 3, label: 'Semifinalist', points: 100 },
            ],
        },
        participants: [
            { id: 11, registrationId: 101, registration: { members: [{ userId: 1 }, { userId: 5 }] } },
            { id: 12, registrationId: 102, registration: { members: [{ userId: 2 }] } },
            { id: 13, registrationId: 103, registration: { members: [{ userId: 3 }] } },
            { id: 14, registrationId: 104, registration: { members: [{ userId: 4 }] } },
        ],
        matches: [
            {
                id: 91,
                roundNumber: 1,
                status: 'COMPLETED',
                winnerParticipantId: 11,
                slots: [{ participantId: 11 }, { participantId: 12 }],
            },
            {
                id: 92,
                roundNumber: 1,
                status: 'COMPLETED',
                winnerParticipantId: 13,
                slots: [{ participantId: 13 }, { participantId: 14 }],
            },
            {
                id: 93,
                roundNumber: 2,
                status: 'COMPLETED',
                winnerParticipantId: 11,
                slots: [{ participantId: 11 }, { participantId: 13 }],
            },
        ],
    };
    const returnedDraw = { ...draw, finalizedAt: new Date('2026-11-20T00:00:00Z') };
    const transaction = {
        $queryRaw: async () => [{ id: 10 }],
        tournamentDraw: {
            findUnique: async (args) => (
                args.include?.tournamentCategory ? returnedDraw : draw
            ),
            update: async ({ data }) => { awardCalls.finalizedAt = data.finalizedAt; },
        },
        tournamentRankingPointAward: {
            findMany: async (args) => {
                if (args.where.userId) return [];
                return awardCalls.created.map((award, index) => ({
                    ...award,
                    id: index + 1,
                    user: { id: award.userId, name: `Player ${award.userId}` },
                }));
            },
            createMany: async ({ data }) => { awardCalls.created = data; },
        },
    };
    const repository = new PrismaTournamentDrawRepository(
        { $transaction: (callback) => callback(transaction) },
        new SingleEliminationGenerator(),
    );

    const result = await repository.finalizeResults(10);

    assert.equal(result.draw.finalizedAt.toISOString(), '2026-11-20T00:00:00.000Z');
    assert.equal(result.rankingPointAwards.length, 5);
    assert.deepEqual(awardCalls.created.map(({ userId, position, points }) => [userId, position, points]), [
        [1, 1, 300],
        [5, 1, 300],
        [3, 2, 200],
        [2, 3, 100],
        [4, 3, 100],
    ]);
    assert.ok(awardCalls.finalizedAt instanceof Date);
});

test('lists persisted ranking point history for the selected category', async () => {
    const repository = new PrismaTournamentDrawRepository({
        tournamentCategory: {
            findUnique: async () => ({ id: 3 }),
        },
        tournamentRankingPointAward: {
            findMany: async ({ where }) => {
                assert.deepEqual(where, { tournamentCategoryId: 3 });
                return [{
                    id: 71,
                    tournamentCategoryId: 3,
                    drawId: 10,
                    registrationId: 31,
                    position: 1,
                    label: 'Champion',
                    points: 300,
                    awardedAt: new Date('2026-11-20T00:00:00Z'),
                    draw: { id: 10, version: 2 },
                    user: { id: 8, name: 'Player One' },
                }];
            },
        },
    }, new SingleEliminationGenerator());

    const awards = await repository.listRankingPointAwards(3);

    assert.deepEqual(awards[0], {
        id: 71,
        tournamentCategoryId: 3,
        drawId: 10,
        drawVersion: 2,
        registrationId: 31,
        player: { id: 8, name: 'Player One' },
        position: 1,
        label: 'Champion',
        points: 300,
        awardedAt: new Date('2026-11-20T00:00:00Z'),
    });
});

test('rejects repeated ranking-point finalization', async () => {
    let awardsRead = false;
    const repository = new PrismaTournamentDrawRepository({
        $transaction: (callback) => callback({
            $queryRaw: async () => [{ id: 10 }],
            tournamentDraw: {
                findUnique: async () => ({
                    id: 10,
                    status: 'PUBLISHED',
                    finalizedAt: new Date(),
                }),
            },
            tournamentRankingPointAward: {
                findMany: async () => { awardsRead = true; return []; },
            },
        }),
    }, new SingleEliminationGenerator());

    await assert.rejects(repository.finalizeResults(10), { statusCode: 409 });
    assert.equal(awardsRead, false);
});
