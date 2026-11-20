const test = require('node:test');
const assert = require('node:assert/strict');
const { determineMatchWinner } = require('./MatchScoring');

const scoring21 = {
    pointsToWin: 21,
    winningMargin: 2,
    maxPoints: 30,
    gamesToWin: 2,
};

const scoring15 = {
    pointsToWin: 15,
    winningMargin: 2,
    maxPoints: 21,
    gamesToWin: 2,
};

test('determines a best-of-three winner from sequential completed games', () => {
    assert.equal(determineMatchWinner([
        { gameNumber: 1, participant1Score: 21, participant2Score: 18 },
        { gameNumber: 2, participant1Score: 19, participant2Score: 21 },
        { gameNumber: 3, participant1Score: 21, participant2Score: 15 },
    ], scoring21), 1);
});

test('supports the 15-point format and sudden-death points at the configured cap', () => {
    assert.equal(determineMatchWinner([
        { gameNumber: 1, participant1Score: 21, participant2Score: 20 },
        { gameNumber: 2, participant1Score: 15, participant2Score: 13 },
    ], scoring15), 1);
});

test('rejects invalid game endings, incomplete matches, and games after a match is decided', () => {
    assert.throws(() => determineMatchWinner([
        { gameNumber: 1, participant1Score: 15, participant2Score: 14 },
        { gameNumber: 2, participant1Score: 15, participant2Score: 14 },
    ], scoring15), RangeError);
    assert.throws(() => determineMatchWinner([
        { gameNumber: 1, participant1Score: 21, participant2Score: 10 },
    ], scoring21), RangeError);
    assert.throws(() => determineMatchWinner([
        { gameNumber: 1, participant1Score: 21, participant2Score: 10 },
        { gameNumber: 2, participant1Score: 21, participant2Score: 10 },
        { gameNumber: 3, participant1Score: 21, participant2Score: 10 },
    ], scoring21), RangeError);
});
