const test = require('node:test');
const assert = require('node:assert/strict');
const {
    seedMatchResults,
    createWinningGames,
} = require('../prisma/seedings/seed-match-results');

const validEnvironment = {
    SEED_TEST_DATA: 'true',
};

function createContext({ matches, finalizedAt = null }) {
    const calls = [];
    const draw = {
        id: 8,
        version: 4,
        status: 'PUBLISHED',
        finalizedAt,
        configurationSnapshot: {
            scoringRules: {
                pointsToWin: 21,
                winningMargin: 2,
                maxPoints: 30,
                gamesToWin: 2,
            },
        },
        matches,
    };
    const database = {
        tournament: {
            findFirst: async () => ({ id: 1 }),
        },
        category: {
            findUnique: async () => ({ id: 2 }),
        },
        tournamentCategory: {
            findFirst: async () => ({ id: 3 }),
        },
        tournamentDraw: {
            findFirst: async () => ({
                id: draw.id,
                version: draw.version,
                status: draw.status,
                finalizedAt: draw.finalizedAt,
            }),
        },
    };
    const drawRepository = {
        getDraw: async () => draw,
        recordMatchResult: async (drawId, matchId, games) => {
            calls.push({ drawId, matchId, games });
            const match = draw.matches.find(({ id }) => id === matchId);
            match.status = 'COMPLETED';
            match.result = { games };
        },
    };

    return { calls, database, drawRepository };
}

test('creates valid scores using the draw scoring snapshot', () => {
    assert.deepEqual(createWinningGames({
        pointsToWin: 21,
        winningMargin: 2,
        maxPoints: 30,
        gamesToWin: 2,
    }, 1), [
        { gameNumber: 1, participant1Score: 21, participant2Score: 19 },
        { gameNumber: 2, participant1Score: 21, participant2Score: 19 },
    ]);
    assert.deepEqual(createWinningGames({
        pointsToWin: 21,
        winningMargin: 2,
        maxPoints: 30,
        gamesToWin: 1,
    }, 2), [
        { gameNumber: 1, participant1Score: 19, participant2Score: 21 },
    ]);
});

test('seeds only ready pending matches and preserves existing results and byes', async () => {
    const context = createContext({
        matches: [
            {
                id: 10,
                roundNumber: 1,
                matchNumber: 1,
                status: 'COMPLETED',
                result: { games: [{ gameNumber: 1, participant1Score: 21, participant2Score: 10 }] },
                slots: [{ participantId: 1 }, { participantId: 2 }],
            },
            {
                id: 11,
                roundNumber: 1,
                matchNumber: 2,
                status: 'BYE',
                slots: [{ participantId: 3 }, { participantId: null }],
            },
            {
                id: 12,
                roundNumber: 1,
                matchNumber: 3,
                status: 'PENDING',
                slots: [{ participantId: 4 }, { participantId: 5 }],
            },
        ],
    });

    const result = await seedMatchResults(
        context.database,
        validEnvironment,
        { drawRepository: context.drawRepository },
    );

    assert.equal(context.calls.length, 1);
    assert.equal(context.calls[0].drawId, 8);
    assert.equal(context.calls[0].matchId, 12);
    assert.equal(result.seededMatchCount, 1);
    assert.equal(result.completedMatchCount, 2);
    assert.equal(result.byeMatchCount, 1);
    assert.equal(result.pendingMatchCount, 0);
    assert.equal(result.finalized, false);
});

test('requires explicit test-data opt-in and refuses finalized draws', async () => {
    const context = createContext({ matches: [], finalizedAt: new Date() });
    await assert.rejects(
        seedMatchResults(context.database, { ...validEnvironment, SEED_TEST_DATA: undefined }),
        /SEED_TEST_DATA=true/,
    );
    await assert.rejects(
        seedMatchResults(context.database, { ...validEnvironment, NODE_ENV: 'production' }),
        /cannot be seeded in production/,
    );
    await assert.rejects(
        seedMatchResults(context.database, validEnvironment, {
            drawRepository: context.drawRepository,
        }),
        /finalized/,
    );
    assert.equal(context.calls.length, 0);
});
