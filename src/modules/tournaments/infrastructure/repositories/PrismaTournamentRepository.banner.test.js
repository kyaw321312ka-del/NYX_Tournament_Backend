const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaTournamentRepository = require('./PrismaTournamentRepository');

function createRepository({ existing = {
    id: 8,
    publicationStatus: 'draft',
    bannerUrl: '/uploads/tournament-banners/old.jpg',
} } = {}) {
    const calls = [];
    const prisma = {
        $transaction: async (callback) => callback({
            tournament: {
                findFirst: async (args) => {
                    calls.push(['findFirst', args]);
                    return existing;
                },
                update: async (args) => {
                    calls.push(['update', args]);
                    return {
                        id: args.where.id,
                        createdBy: 4,
                        title: 'Test tournament',
                        bannerUrl: args.data.bannerUrl,
                        publicationStatus: 'draft',
                        categories: [],
                        venues: [],
                        rules: [],
                    };
                },
            },
        }),
    };

    return { repository: new PrismaTournamentRepository(prisma), calls };
}

test('updates the banner for an owned draft and returns the previous URL', async () => {
    const { repository, calls } = createRepository();

    const result = await repository.updateBannerOwned(8, 4, '/uploads/tournament-banners/new.png');

    assert.equal(result.tournament.bannerUrl, '/uploads/tournament-banners/new.png');
    assert.equal(result.previousBannerUrl, '/uploads/tournament-banners/old.jpg');
    assert.deepEqual(calls[0][1].where, { id: 8, createdBy: 4 });
    assert.deepEqual(calls[1][1].data, { bannerUrl: '/uploads/tournament-banners/new.png' });
});

test('rejects missing tournaments and published tournaments without updating', async (t) => {
    const scenarios = [
        { name: 'missing tournament', existing: null, statusCode: 404 },
        {
            name: 'published tournament',
            existing: { id: 8, publicationStatus: 'published', bannerUrl: null },
            statusCode: 409,
        },
    ];

    for (const scenario of scenarios) {
        await t.test(scenario.name, async () => {
            const { repository, calls } = createRepository({ existing: scenario.existing });

            await assert.rejects(
                repository.updateBannerOwned(8, 4, '/uploads/tournament-banners/new.png'),
                (error) => error.statusCode === scenario.statusCode,
            );
            assert.equal(calls.some(([operation]) => operation === 'update'), false);
        });
    }
});
