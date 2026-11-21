const test = require('node:test');
const assert = require('node:assert/strict');
const SingleEliminationGenerator = require('./SingleEliminationGenerator');

test('generates bracket positions and feeder matches for a power-of-two draw', () => {
    const { positions, matches } = new SingleEliminationGenerator().generate(8);

    assert.equal(positions.length, 8);
    assert.equal(matches.filter(({ roundNumber }) => roundNumber === 3).length, 1);
    assert.deepEqual(matches[0].slots, [
        { slotNumber: 1, bracketPosition: 1 },
        { slotNumber: 2, bracketPosition: 2 },
    ]);
    assert.deepEqual(matches.find(({ roundNumber, matchNumber }) => roundNumber === 2 && matchNumber === 1).slots, [
        { slotNumber: 1, sourceMatchKey: 'SE-R1-M1' },
        { slotNumber: 2, sourceMatchKey: 'SE-R1-M2' },
    ]);
    assert.deepEqual(matches.find(({ roundNumber, matchNumber }) => roundNumber === 3 && matchNumber === 1).slots, [
        { slotNumber: 1, sourceMatchKey: 'SE-R2-M1' },
        { slotNumber: 2, sourceMatchKey: 'SE-R2-M2' },
    ]);
});

test('adds a third-place match sourced from semifinal losers', () => {
    const { matches } = new SingleEliminationGenerator().generate(8, {
        thirdPlaceMatch: true,
    });
    const thirdPlace = matches.find(({ key }) => key === 'SE-THIRD-PLACE');

    assert.equal(thirdPlace.roundNumber, 4);
    assert.equal(thirdPlace.matchNumber, 1);
    assert.deepEqual(thirdPlace.slots, [
        { slotNumber: 1, sourceMatchKey: 'SE-R2-M1' },
        { slotNumber: 2, sourceMatchKey: 'SE-R2-M2' },
    ]);
});

test('rejects bracket sizes that are not powers of two', () => {
    const generator = new SingleEliminationGenerator();

    for (const size of [0, 1, 3, 6, 8.5]) {
        assert.throws(() => generator.generate(size), RangeError);
    }
});
