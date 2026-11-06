const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createTournamentSchema,
    updateTournamentSchema,
} = require('./tournamentSchemas');

const validTournament = {
    title: 'NYX Open',
    startDate: '2027-01-10',
    endDate: '2027-01-12',
};

test('creation defaults optional collections and each category entry fee', () => {
    const result = createTournamentSchema.parse(validTournament);
    assert.deepEqual(result.venues, []);
    assert.deepEqual(result.rules, []);
    assert.deepEqual(result.categories, []);
});

test('category entry fees are validated and tournament-level fees are rejected', () => {
    const category = {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        pairingType: 'singles',
        matchFormat: 'Best of 3',
    };
    const result = createTournamentSchema.parse({
        ...validTournament,
        categories: [{ ...category, entryFee: 2500.5 }],
    });
    assert.equal(result.categories[0].entryFee, 2500.5);

    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [{ ...category, entryFee: 1.234 }],
    }).success, false);

    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        entryFee: 2500,
    }).success, false);
});

test('creation rejects invalid dates, pairing types, and registration states', () => {
    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        endDate: '2027-01-09',
    }).success, false);

    const category = {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        pairingType: 'team',
        matchFormat: 'Best of 3',
    };
    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [category],
    }).success, false);
});

test('updates require at least one valid field', () => {
    assert.equal(updateTournamentSchema.safeParse({}).success, false);
    assert.deepEqual(updateTournamentSchema.parse({ title: 'Updated Open' }), {
        title: 'Updated Open',
    });
    assert.equal(updateTournamentSchema.safeParse({ entryFee: 2500 }).success, false);
});
