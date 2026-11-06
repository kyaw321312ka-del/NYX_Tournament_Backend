const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaTournamentRepository = require('./PrismaTournamentRepository');

test('persists entry fees with tournament categories, not the tournament', async () => {
    let createData;
    const prisma = {
        tournament: {
            create: async ({ data }) => {
                createData = data;
                return {
                    id: 15,
                    ...data,
                    categories: data.categories.create.map((category, index) => ({
                        id: index + 1,
                        ...category,
                        entryFee: `${category.entryFee}.00`,
                        pointTiers: [],
                    })),
                };
            },
        },
    };
    const repository = new PrismaTournamentRepository(prisma);

    await repository.create(3, {
        title: 'NYX Open',
        startDate: '2027-05-10',
        endDate: '2027-05-11',
        venues: [],
        rules: [],
        categories: [
            { categoryCode: 'MS', categoryName: 'Men Singles', entryFee: 10000, pointTiers: [] },
            { categoryCode: 'MD', categoryName: 'Men Doubles', entryFee: 20000, pointTiers: [] },
        ],
    });

    assert.equal('entryFee' in createData, false);
    assert.deepEqual(
        createData.categories.create.map(({ categoryCode, entryFee }) => [categoryCode, entryFee]),
        [['MS', 10000], ['MD', 20000]],
    );
});
