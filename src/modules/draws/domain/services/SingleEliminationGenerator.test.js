const test = require('node:test');
const assert = require('node:assert/strict');
const SingleEliminationGenerator = require('./SingleEliminationGenerator');

test('generates bracket positions and feeder matches for a power-of-two draw', () => {
    const rounds = new SingleEliminationGenerator().generate(8);

    assert.equal(rounds.length, 3);
    assert.deepEqual(rounds[0][0].slots, [
        { slotNumber: 1, bracketPosition: 1 },
        { slotNumber: 2, bracketPosition: 2 },
    ]);
    assert.deepEqual(rounds[1][0].slots, [
        { slotNumber: 1, sourceMatchNumber: 1 },
        { slotNumber: 2, sourceMatchNumber: 2 },
    ]);
    assert.deepEqual(rounds[2][0].slots, [
        { slotNumber: 1, sourceMatchNumber: 1 },
        { slotNumber: 2, sourceMatchNumber: 2 },
    ]);
});

test('rejects bracket sizes that are not powers of two', () => {
    const generator = new SingleEliminationGenerator();

    for (const size of [0, 1, 3, 6, 8.5]) {
        assert.throws(() => generator.generate(size), RangeError);
    }
});
