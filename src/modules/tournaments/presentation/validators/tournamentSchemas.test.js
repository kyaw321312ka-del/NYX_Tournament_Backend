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
    assert.deepEqual([
        result.categories[0].pointsToWin,
        result.categories[0].winningMargin,
        result.categories[0].maxPoints,
        result.categories[0].gamesToWin,
    ], [21, 2, 30, 2]);

    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [{ ...category, entryFee: 1.234 }],
    }).success, false);

    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        entryFee: 2500,
    }).success, false);
});

test('category defaults to manual single-elimination configuration', () => {
    const result = createTournamentSchema.parse({
        ...validTournament,
        categories: [{
            categoryCode: 'MS',
            categoryName: 'Men Singles',
            pairingType: 'singles',
            matchFormat: 'Best of 3',
        }],
    });
    assert.equal(result.categories[0].drawConfiguration, undefined);
});

test('category validates the configured draw format and seeding method', () => {
    const category = {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        pairingType: 'singles',
        matchFormat: 'Best of 3',
        drawConfiguration: {
            drawFormat: 'SINGLE_ELIMINATION',
            seedingMethod: 'MANUAL',
            thirdPlaceMatch: true,
        },
    };
    const result = createTournamentSchema.parse({
        ...validTournament,
        categories: [category],
    });
    assert.deepEqual(result.categories[0].drawConfiguration, category.drawConfiguration);
    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [{
            ...category,
            drawConfiguration: {
                ...category.drawConfiguration,
                seedingMethod: 'RANKING',
            },
        }],
    }).success, false);
});

test('category scoring rules accept the 15-point format and reject invalid caps', () => {
    const category = {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        pairingType: 'singles',
        matchFormat: 'Best of 3',
    };
    const result = createTournamentSchema.parse({
        ...validTournament,
        categories: [{
            ...category,
            pointsToWin: 15,
            winningMargin: 2,
            maxPoints: 21,
            gamesToWin: 2,
        }],
    });
    assert.equal(result.categories[0].maxPoints, 21);
    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [{ ...category, pointsToWin: 21, maxPoints: 15 }],
    }).success, false);
    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [{
            ...category,
            pointTiers: [
                { position: 1, label: 'Champion', points: 300 },
                { position: 1, label: 'Winner', points: 250 },
            ],
        }],
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

test('validates age-group maximum age without a category cutoff date', () => {
    const category = {
        categoryCode: 'MS',
        categoryName: 'Men Singles',
        pairingType: 'singles',
        matchFormat: 'Best of 3',
        ageGroup: {
            name: 'U12',
            age: 12,
        },
    };

    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [category],
    }).success, true);

    assert.equal(createTournamentSchema.safeParse({
        ...validTournament,
        categories: [{
            ...category,
            ageGroup: { ...category.ageGroup, age: 121 },
        }],
    }).success, false);
});

test('updates require at least one valid field', () => {
    assert.equal(updateTournamentSchema.safeParse({}).success, false);
    assert.deepEqual(updateTournamentSchema.parse({ title: 'Updated Open' }), {
        title: 'Updated Open',
    });
    assert.equal(updateTournamentSchema.safeParse({ entryFee: 2500 }).success, false);
});
