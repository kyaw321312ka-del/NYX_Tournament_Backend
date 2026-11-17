const test = require('node:test');
const assert = require('node:assert/strict');
const Tournament = require('./Tournament');

test('serializes each tournament category entry fee as a decimal string', () => {
    const tournament = Tournament.fromRecord({
        id: 8,
        title: 'NYX Open',
        categories: [
            {
                id: 1,
                eventCategory: { categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
                entryFee: { toString: () => '10000.00' },
                pointTiers: [],
            },
            {
                id: 2,
                eventCategory: { categoryCode: 'MD', name: "Men's Doubles", pairingType: 'doubles' },
                entryFee: null,
                pointTiers: [],
            },
        ],
    });

    const result = tournament.toJSON();

    assert.equal('entryFee' in result, false);
    assert.equal(result.categories[0].entryFee, '10000.00');
    assert.equal(result.categories[1].entryFee, '0');
});

test('serializes age-group name and maximum age', () => {
    const tournament = Tournament.fromRecord({
        categories: [{
            id: 1,
            eventCategory: { categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
            ageGroup: {
                id: 4,
                name: 'U12',
                age: 12,
            },
            entryFee: 0,
            pointTiers: [],
        }],
    });

    assert.deepEqual(tournament.toJSON().categories[0].ageGroup, {
        id: 4,
        name: 'U12',
        age: 12,
    });
});
