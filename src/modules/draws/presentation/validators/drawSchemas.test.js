const test = require('node:test');
const assert = require('node:assert/strict');
const schemas = require('./drawSchemas');

test('manual single-elimination draw creation accepts only supported settings', () => {
    assert.equal(schemas.createDrawSchema.safeParse({
        drawFormat: 'SINGLE_ELIMINATION',
        seedingMethod: 'MANUAL',
    }).success, true);
    assert.equal(schemas.createDrawSchema.safeParse({
        drawFormat: 'ROUND_ROBIN',
        seedingMethod: 'MANUAL',
    }).success, false);
});

test('position assignments coerce IDs and reject unknown fields', () => {
    assert.deepEqual(schemas.assignPositionsSchema.parse({
        assignments: [{ registrationId: '5', bracketPosition: '2' }],
    }), {
        assignments: [{ registrationId: 5, bracketPosition: 2 }],
    });
    assert.equal(schemas.assignPositionsSchema.safeParse({
        assignments: [{ registrationId: 'bad', bracketPosition: '2' }],
    }).success, false);
    assert.equal(schemas.assignPositionsSchema.safeParse({
        assignments: [],
        extra: true,
    }).success, false);
});
