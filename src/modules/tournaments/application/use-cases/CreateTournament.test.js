const test = require('node:test');
const assert = require('node:assert/strict');
const CreateTournament = require('./CreateTournament');

const tournamentInput = {
    title: 'Banner Test Tournament',
    startDate: '2027-05-10',
    endDate: '2027-05-11',
    venues: [],
    rules: [],
    categories: [],
};

test('creates a tournament with the banner uploaded in the same request', async () => {
    const calls = [];
    const tournament = { id: 8, bannerUrl: '/uploads/tournament-banners/banner.jpg' };
    const useCase = new CreateTournament({
        bannerStorage: {
            save: async (buffer) => {
                calls.push(['save', buffer]);
                return tournament.bannerUrl;
            },
            remove: async (url) => calls.push(['remove', url]),
        },
        tournamentRepository: {
            create: async (userId, input) => {
                calls.push(['create', userId, input]);
                return tournament;
            },
        },
    });

    const result = await useCase.execute(4, tournamentInput, { buffer: Buffer.from('banner') });

    assert.equal(result, tournament);
    assert.deepEqual(calls.map(([action]) => action), ['save', 'create']);
    assert.equal(calls[1][1], 4);
    assert.equal(calls[1][2].bannerUrl, tournament.bannerUrl);
});

test('removes uploaded banner if tournament creation fails', async () => {
    const removed = [];
    const useCase = new CreateTournament({
        bannerStorage: {
            save: async () => '/uploads/tournament-banners/banner.jpg',
            remove: async (url) => removed.push(url),
        },
        tournamentRepository: {
            create: async () => {
                throw new Error('Database unavailable');
            },
        },
    });

    await assert.rejects(
        useCase.execute(4, tournamentInput, { buffer: Buffer.from('banner') }),
        /Database unavailable/,
    );
    assert.deepEqual(removed, ['/uploads/tournament-banners/banner.jpg']);
});

test('preserves JSON create behavior when no banner file is uploaded', async () => {
    let receivedInput;
    const useCase = new CreateTournament({
        tournamentRepository: {
            create: async (userId, input) => {
                receivedInput = { userId, input };
                return { id: 8, bannerUrl: null };
            },
        },
    });

    await useCase.execute(4, tournamentInput);

    assert.equal(receivedInput.userId, 4);
    assert.equal(receivedInput.input.bannerUrl, null);
});
