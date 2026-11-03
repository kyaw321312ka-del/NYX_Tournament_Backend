const test = require('node:test');
const assert = require('node:assert/strict');
const UpdateTournamentBanner = require('./UpdateTournamentBanner');

test('stores new banner, updates its tournament, and removes previous banner', async () => {
    const calls = [];
    const tournament = { id: 8, bannerUrl: '/uploads/tournament-banners/new.png' };
    const useCase = new UpdateTournamentBanner({
        bannerStorage: {
            save: async (buffer) => {
                calls.push(['save', buffer]);
                return tournament.bannerUrl;
            },
            remove: async (url) => calls.push(['remove', url]),
        },
        tournamentRepository: {
            updateBannerOwned: async (id, userId, bannerUrl) => {
                calls.push(['update', id, userId, bannerUrl]);
                return {
                    tournament,
                    previousBannerUrl: '/uploads/tournament-banners/old.jpg',
                };
            },
        },
    });

    assert.equal(await useCase.execute(8, 4, { buffer: Buffer.from('image') }), tournament);
    assert.deepEqual(calls.map(([action]) => action), ['save', 'update', 'remove']);
    assert.deepEqual(calls[1], ['update', 8, 4, tournament.bannerUrl]);
});

test('removes the newly saved banner if the tournament update fails', async () => {
    const removed = [];
    const useCase = new UpdateTournamentBanner({
        bannerStorage: {
            save: async () => '/uploads/tournament-banners/new.png',
            remove: async (url) => removed.push(url),
        },
        tournamentRepository: {
            updateBannerOwned: async () => {
                throw new Error('Database unavailable');
            },
        },
    });

    await assert.rejects(
        useCase.execute(8, 4, { buffer: Buffer.from('image') }),
        /Database unavailable/,
    );
    assert.deepEqual(removed, ['/uploads/tournament-banners/new.png']);
});

test('requires a multipart banner file', async () => {
    const useCase = new UpdateTournamentBanner({
        bannerStorage: { save: async () => assert.fail('Must not save without a file') },
        tournamentRepository: { updateBannerOwned: async () => assert.fail('Must not update without a file') },
    });

    await assert.rejects(
        useCase.execute(8, 4, undefined),
        (error) => error.statusCode === 400,
    );
});
