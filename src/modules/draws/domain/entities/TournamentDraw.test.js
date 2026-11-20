const test = require('node:test');
const assert = require('node:assert/strict');
const TournamentDraw = require('./TournamentDraw');

test('serializes draw rounds, assignments, and winners without internal relations', () => {
    const draw = TournamentDraw.fromRecord({
        id: 12,
        tournamentCategoryId: 4,
        version: 2,
        status: 'PUBLISHED',
        configurationSnapshot: {
            bracketSize: 2,
            eligibleRegistrationIds: [55, 56],
            scoringRules: {
                pointsToWin: 21,
                winningMargin: 2,
                maxPoints: 30,
                gamesToWin: 2,
            },
            pointTiers: [{ position: 1, label: 'Champion', points: 300 }],
        },
        generatedAt: new Date('2026-11-20T00:00:00Z'),
        publishedAt: new Date('2026-11-20T00:10:00Z'),
        participants: [{
            id: 31,
            registrationId: 55,
            bracketPosition: 1,
            seedNumber: null,
            registration: {
                id: 55,
                registeredAt: new Date('2026-11-19T00:00:00Z'),
                status: { name: 'confirmed' },
                members: [{ user: { id: 7, name: 'Player One' } }],
            },
        }],
        matches: [{
            id: 91,
            roundNumber: 1,
            matchNumber: 1,
            status: 'BYE',
            result: null,
            winnerParticipant: {
                id: 31,
                registrationId: 55,
                bracketPosition: 1,
                seedNumber: null,
                registration: {
                    id: 55,
                    status: { name: 'confirmed' },
                    members: [{ user: { id: 7, name: 'Player One' } }],
                },
            },
            slots: [{
                slotNumber: 1,
                bracketPosition: 1,
                sourceMatchId: null,
                participant: {
                    id: 31,
                    registrationId: 55,
                    bracketPosition: 1,
                    seedNumber: null,
                    registration: {
                        id: 55,
                        status: { name: 'confirmed' },
                        members: [{ user: { id: 7, name: 'Player One' } }],
                    },
                },
            }],
        }],
    });
    const json = draw.toJSON();
    assert.equal(json.rounds[0].matches[0].status, 'BYE');
    assert.equal(json.rounds[0].matches[0].winner.registration.members[0].name, 'Player One');
    assert.equal(json.participants[0].registration.status, 'confirmed');
    assert.equal(json.configuration.eligibleRegistrationCount, 2);
    assert.equal('eligibleRegistrationIds' in json.configuration, false);
    assert.equal(json.configuration.scoringRules.pointsToWin, 21);
    assert.equal(json.configuration.pointTiers[0].points, 300);
    assert.equal(json.rounds[0].matches[0].result, null);
});
