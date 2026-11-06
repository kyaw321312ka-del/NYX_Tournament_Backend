const test = require('node:test');
const assert = require('node:assert/strict');
const Tournament = require('./Tournament');

test('serializes each tournament category entry fee as a decimal string', () => {
    const tournament = Tournament.fromRecord({
        id: 8,
        title: 'NYX Open',
        categories: [
            { id: 1, categoryCode: 'MS', entryFee: { toString: () => '10000.00' }, pointTiers: [] },
            { id: 2, categoryCode: 'MD', entryFee: null, pointTiers: [] },
        ],
    });

    const result = tournament.toJSON();

    assert.equal('entryFee' in result, false);
    assert.equal(result.categories[0].entryFee, '10000.00');
    assert.equal(result.categories[1].entryFee, '0');
});
