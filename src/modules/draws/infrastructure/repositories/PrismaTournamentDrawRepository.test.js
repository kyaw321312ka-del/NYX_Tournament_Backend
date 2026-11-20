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
                        configurationSnapshot: { bracketSize: 4 },
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
                        eligibleRegistrationIds: [31, 32, 33],
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
                    eligibleRegistrationIds: [31, 32],
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
