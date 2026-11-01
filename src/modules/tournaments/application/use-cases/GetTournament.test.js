const test = require('node:test');
const assert = require('node:assert/strict');
const GetTournament = require('./GetTournament');
const PublicationStatus = require('../../domain/enums/PublicationStatus');

test('public users can get published tournaments', async () => {
    const tournament = { id: 2, createdBy: 8, publicationStatus: PublicationStatus.PUBLISHED };
    const useCase = new GetTournament({
        tournamentRepository: { findById: async () => tournament },
    });

    assert.equal(await useCase.execute(2), tournament);
});

test('owners can get drafts but other users cannot discover them', async () => {
    const draft = { id: 2, createdBy: 8, publicationStatus: PublicationStatus.DRAFT };
    const useCase = new GetTournament({
        tournamentRepository: { findById: async () => draft },
    });

    assert.equal(await useCase.execute(2, 8), draft);
    await assert.rejects(useCase.execute(2, 9), { statusCode: 404 });
    await assert.rejects(useCase.execute(2), { statusCode: 404 });
});
