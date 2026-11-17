const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaTournamentRepository = require('./PrismaTournamentRepository');

function createTournamentPrisma(categoryDefinitions) {
    const calls = {
        tournamentCreate: [],
        ageGroupUpsert: [],
        tournamentCategoryCreate: [],
    };
    const ageGroups = new Map();
    const tournamentCategories = [];
    const transaction = {
        category: {
            findMany: async () => categoryDefinitions,
        },
        ageGroup: {
            upsert: async (args) => {
                calls.ageGroupUpsert.push(args);
                const key = JSON.stringify([
                    args.where.name_age.name.toLowerCase(),
                    args.where.name_age.age,
                ]);
                const existing = ageGroups.get(key);
                const record = {
                    id: existing?.id ?? ageGroups.size + 1,
                    ...(existing ?? args.create),
                    ...args.update,
                };
                ageGroups.set(key, record);
                return record;
            },
        },
        tournament: {
            create: async ({ data }) => {
                calls.tournamentCreate.push(data);
                return { id: 15 };
            },
            findUnique: async () => ({
                id: 15,
                categories: tournamentCategories,
            }),
        },
        tournamentCategory: {
            create: async ({ data }) => {
                calls.tournamentCategoryCreate.push(data);
                const definition = categoryDefinitions.find(({ id }) => id === data.categoryId);
                const ageGroup = [...ageGroups.values()].find(({ id }) => id === data.ageGroupId) ?? null;
                const category = {
                    id: tournamentCategories.length + 1,
                    ...data,
                    eventCategory: definition,
                    ageGroup,
                    entryFee: `${data.entryFee}.00`,
                    pointTiers: [],
                };
                tournamentCategories.push(category);
                return category;
            },
        },
    };
    return {
        prisma: { $transaction: async (callback) => callback(transaction) },
        calls,
    };
}

test('persists entry fees with tournament categories, not the tournament', async () => {
    const categoryDefinitions = [
        { id: 11, categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
        { id: 12, categoryCode: 'MD', name: "Men's Doubles", pairingType: 'doubles' },
    ];
    const { prisma, calls } = createTournamentPrisma(categoryDefinitions);
    const repository = new PrismaTournamentRepository(prisma);

    const tournament = await repository.create(3, {
        title: 'NYX Open',
        startDate: '2027-05-10',
        endDate: '2027-05-11',
        venues: [],
        rules: [],
        categories: [
            {
                categoryCode: 'MS',
                categoryName: "Men's Singles",
                pairingType: 'singles',
                entryFee: 10000,
                pointTiers: [],
            },
            {
                categoryCode: 'MD',
                categoryName: "Men's Doubles",
                pairingType: 'doubles',
                entryFee: 20000,
                ageGroup: {
                    name: 'U12',
                    age: 12,
                },
                pointTiers: [],
            },
        ],
    });

    assert.equal('entryFee' in calls.tournamentCreate[0], false);
    assert.deepEqual(
        calls.tournamentCategoryCreate.map(({ categoryId, entryFee, ageGroupId }) => [
            categoryId,
            entryFee,
            ageGroupId,
        ]),
        [[11, 10000, null], [12, 20000, 1]],
    );
    assert.equal(calls.ageGroupUpsert[0].create.name, 'U12');
    assert.deepEqual(
        tournament.toJSON().categories.map(({ categoryCode, categoryName, pairingType }) => [
            categoryCode,
            categoryName,
            pairingType,
        ]),
        [['MS', "Men's Singles", 'singles'], ['MD', "Men's Doubles", 'doubles']],
    );
});

test('allows separate age divisions for the same catalog category', async () => {
    const categoryDefinitions = [
        { id: 11, categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
    ];
    const { prisma, calls } = createTournamentPrisma(categoryDefinitions);
    const repository = new PrismaTournamentRepository(prisma);

    await repository.create(3, {
        title: 'NYX Open',
        startDate: '2027-05-10',
        endDate: '2027-05-11',
        venues: [],
        rules: [],
        categories: [
            {
                categoryCode: 'MS',
                categoryName: "Men's Singles",
                pairingType: 'singles',
                entryFee: 10000,
                ageGroup: {
                    name: 'U12',
                    age: 12,
                },
                pointTiers: [],
            },
            {
                categoryCode: 'MS',
                categoryName: "Men's Singles",
                pairingType: 'singles',
                entryFee: 10000,
                ageGroup: {
                    name: 'U13',
                    age: 13,
                },
                pointTiers: [],
            },
        ],
    });

    assert.equal(calls.ageGroupUpsert.length, 2);
    assert.deepEqual(calls.tournamentCategoryCreate.map(({ ageGroupId }) => ageGroupId), [1, 2]);
});

test('rejects duplicate unrestricted categories even though the age-group key is nullable', async () => {
    const { prisma, calls } = createTournamentPrisma([
        { id: 11, categoryCode: 'MS', name: "Men's Singles", pairingType: 'singles' },
    ]);
    const repository = new PrismaTournamentRepository(prisma);
    const category = {
        categoryCode: 'MS',
        categoryName: "Men's Singles",
        pairingType: 'singles',
        entryFee: 10000,
        pointTiers: [],
    };

    await assert.rejects(
        repository.create(3, {
            title: 'NYX Open',
            startDate: '2027-05-10',
            endDate: '2027-05-11',
            venues: [],
            rules: [],
            categories: [category, category],
        }),
        (error) => error.statusCode === 400 && /same age group/.test(error.message),
    );
    assert.equal(calls.tournamentCategoryCreate.length, 0);
});

test('rejects tournament categories that are not in the shared catalog', async () => {
    const { prisma, calls } = createTournamentPrisma([]);
    const repository = new PrismaTournamentRepository(prisma);

    await assert.rejects(
        repository.create(3, {
            title: 'NYX Open',
            startDate: '2027-05-10',
            endDate: '2027-05-11',
            venues: [],
            rules: [],
            categories: [{
                categoryCode: 'UNKNOWN',
                categoryName: 'Unknown',
                pairingType: 'singles',
                entryFee: 0,
                pointTiers: [],
            }],
        }),
        (error) => error.statusCode === 400 && /Unknown tournament category code/.test(error.message),
    );
    assert.equal(calls.tournamentCategoryCreate.length, 0);
});

test('rejects a tournament pairing type that conflicts with its catalog category', async () => {
    const { prisma, calls } = createTournamentPrisma([{
                id: 11,
                categoryCode: 'MS',
                name: "Men's Singles",
                pairingType: 'singles',
            }]);
    const repository = new PrismaTournamentRepository(prisma);

    await assert.rejects(
        repository.create(3, {
            title: 'NYX Open',
            startDate: '2027-05-10',
            endDate: '2027-05-11',
            venues: [],
            rules: [],
            categories: [{
                categoryCode: 'MS',
                categoryName: "Men's Singles",
                pairingType: 'doubles',
                entryFee: 0,
                pointTiers: [],
            }],
        }),
        (error) => error.statusCode === 400 && /Pairing type does not match/.test(error.message),
    );
    assert.equal(calls.tournamentCategoryCreate.length, 0);
});

test('updates draft tournament categories through shared category IDs', async () => {
    let updateData;
    const repository = new PrismaTournamentRepository({
        tournament: {
            findFirst: async () => ({
                id: 15,
                publicationStatus: 'draft',
                startDate: new Date('2027-05-10T00:00:00Z'),
                endDate: new Date('2027-05-11T00:00:00Z'),
                bannerUrl: null,
            }),
        },
        $transaction: async (callback) => callback({
            category: {
                    findMany: async () => [{
                        id: 11,
                        categoryCode: 'MS',
                        name: "Men's Singles",
                        pairingType: 'singles',
                    }],
            },
            tournamentCategory: {
                deleteMany: async () => ({ count: 0 }),
            },
            tournament: {
                update: async ({ data }) => {
                    updateData = data;
                    return {
                        id: 15,
                        title: 'NYX Open',
                        categories: data.categories.create.map((category) => ({
                            id: 1,
                            ...category,
                            eventCategory: {
                                categoryCode: 'MS',
                                name: "Men's Singles",
                                pairingType: 'singles',
                            },
                            pointTiers: [],
                        })),
                    };
                },
            },
        }),
    });

    await repository.updateOwned(15, 3, {
        categories: [{
            categoryCode: 'MS',
            categoryName: "Men's Singles",
            pairingType: 'singles',
            entryFee: 10000,
            pointTiers: [],
        }],
    });

    assert.equal(updateData.categories.create[0].categoryId, 11);
    assert.equal('categoryCode' in updateData.categories.create[0], false);
    assert.equal('categoryName' in updateData.categories.create[0], false);
});
