const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('./drawSchemas');

test('draw creation accepts only the current single-elimination scope', () => {
    assert.equal(schemas.createDrawSchema.safeParse({
        drawFormat: 'SINGLE_ELIMINATION',
        seedingMethod: 'MANUAL',
    }).success, true);
    assert.equal(schemas.createDrawSchema.safeParse({
        drawFormat: 'ROUND_ROBIN',
        seedingMethod: 'MANUAL',
    }).success, false);
    assert.equal(schemas.createDrawSchema.safeParse({
        drawFormat: 'GROUP_KNOCKOUT',
        seedingMethod: 'MANUAL',
        groupCount: 1,
        qualifiersPerGroup: 2,
    }).success, false);
});

test('position assignments coerce IDs and reject unknown fields', () => {
    assert.deepEqual(schemas.assignPositionsSchema.parse({
        assignments: [{ registrationId: '5', bracketPosition: '2' }],
    }), {
        assignments: [{ registrationId: 5, bracketPosition: 2 }],
    });
    assert.equal(schemas.assignPositionsSchema.safeParse({
        assignments: [{ registrationId: 'bad', bracketPosition: '2' }],
    }).success, false);
    assert.equal(schemas.assignPositionsSchema.safeParse({
        assignments: [],
        extra: true,
    }).success, false);
});

test('match result input requires numeric sequential game fields', () => {
    assert.deepEqual(schemas.recordMatchResultSchema.parse({
        games: [{
            gameNumber: '1',
            participant1Score: '21',
            participant2Score: '19',
        }],
    }), {
        games: [{
            gameNumber: 1,
            participant1Score: 21,
            participant2Score: 19,
        }],
    });
    assert.equal(schemas.recordMatchResultSchema.safeParse({
        games: [{ gameNumber: 1, participant1Score: -1, participant2Score: 15 }],
    }).success, false);
});
