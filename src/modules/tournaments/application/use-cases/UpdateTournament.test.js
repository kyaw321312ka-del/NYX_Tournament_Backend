const test = require('node:test');
const assert = require('node:assert/strict');
const UpdateTournament = require('./UpdateTournament');

test('updates draft fields and banner together, then removes the replaced banner', async () => {
    const calls = [];
    const tournament = { id: 8, bannerUrl: '/uploads/tournament-banners/new.png' };
    const useCase = new UpdateTournament({
        bannerStorage: {
            save: async () => tournament.bannerUrl,
            remove: async (url) => calls.push(['remove', url]),
        },
        tournamentRepository: {
            updateOwned: async (id, userId, input) => {
                calls.push(['update', id, userId, input]);
                return {
                    tournament,
                    previousBannerUrl: '/uploads/tournament-banners/old.jpg',
                };
            },
        },
    });

    const result = await useCase.execute(
        8,
        4,
        { title: 'Updated title' },
        { buffer: Buffer.from('banner') },
    );

    assert.equal(result, tournament);
    assert.equal(calls[0][3].title, 'Updated title');
    assert.equal(calls[0][3].bannerUrl, tournament.bannerUrl);
    assert.deepEqual(calls[1], ['remove', '/uploads/tournament-banners/old.jpg']);
});

test('removes new banner if the tournament update fails', async () => {
    const removed = [];
    const useCase = new UpdateTournament({
        bannerStorage: {
            save: async () => '/uploads/tournament-banners/new.png',
            remove: async (url) => removed.push(url),
        },
        tournamentRepository: {
            updateOwned: async () => {
                throw new Error('Database unavailable');
            },
        },
    });

    await assert.rejects(
        useCase.execute(8, 4, { title: 'Updated title' }, { buffer: Buffer.from('banner') }),
        /Database unavailable/,
    );
    assert.deepEqual(removed, ['/uploads/tournament-banners/new.png']);
});

test('keeps existing JSON update behavior without a banner upload', async () => {
    const tournament = { id: 8, bannerUrl: null };
    const useCase = new UpdateTournament({
        tournamentRepository: {
            updateOwned: async () => ({
                tournament,
                previousBannerUrl: null,
            }),
        },
    });

    assert.equal(await useCase.execute(8, 4, { title: 'Updated title' }), tournament);
});
