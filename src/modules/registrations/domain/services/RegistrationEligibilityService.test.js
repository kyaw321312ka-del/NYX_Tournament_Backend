const test = require('node:test');
const assert = require('node:assert/strict');
const RegistrationEligibilityService = require('./RegistrationEligibilityService');

const service = new RegistrationEligibilityService();
const category = (categoryCode, pairingType) => ({
    categoryCode,
    pairingType,
    entryStatus: 'open',
    tournament: { publicationStatus: 'published' },
});
const player = (gender, verified = true) => ({
    gender,
    emailVerifiedAt: verified ? new Date() : null,
});

test('applies gender and pairing rules to all supported category codes', () => {
    for (const [code, type, genders] of [
        ['MS', 'singles', ['male']],
        ['WS', 'singles', ['female']],
        ['MD', 'doubles', ['male', 'male']],
        ['WD', 'doubles', ['female', 'female']],
        ['XD', 'mixed_doubles', ['female', 'male']],
    ]) {
        assert.doesNotThrow(() => service.validatePlayers(
            category(code, type),
            genders.map((gender) => player(gender)),
        ));
    }
});

test('normalizes legacy gender casing for eligibility checks', () => {
    assert.doesNotThrow(() => service.validatePlayers(
        category('MS', 'singles'),
        [player(' Male ')],
    ));
});

test('rejects invalid pairings, gender combinations, unverified players, and unsupported gender values', () => {
    assert.throws(
        () => service.validatePlayers(category('MS', 'doubles'), [player('male')]),
        { statusCode: 409 },
    );
    assert.throws(
        () => service.validatePlayers(category('MD', 'doubles'), [player('male'), player('female')]),
        { statusCode: 400 },
    );
    assert.throws(
        () => service.validatePlayers(category('XD', 'mixed_doubles'), [player('male'), player('male')]),
        { statusCode: 400 },
    );
    assert.throws(
        () => service.validatePlayers(category('MS', 'singles'), [player('male', false)]),
        { statusCode: 403 },
    );
    assert.throws(
        () => service.validatePlayers(category('MS', 'singles'), [player('non_binary')]),
        { statusCode: 400 },
    );
    assert.throws(
        () => service.validatePlayers(category('MS', 'singles'), []),
        { statusCode: 400 },
    );
});
test('rejects categories that are closed or unpublished', () => {
    assert.throws(
        () => service.validateCategory({
            ...category('MS', 'singles'),
            entryStatus: 'closed',
        }),
        { statusCode: 409 },
    );
    assert.throws(
        () => service.validateCategory({
            ...category('MS', 'singles'),
            tournament: { publicationStatus: 'draft' },
        }),
        { statusCode: 409 },
    );
});
