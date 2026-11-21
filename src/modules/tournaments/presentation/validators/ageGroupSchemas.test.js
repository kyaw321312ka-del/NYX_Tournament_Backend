const test = require('node:test');
const assert = require('node:assert/strict');
const ageGroupSchemas = require('./ageGroupSchemas');

test('validates age-group creation and update bodies', () => {
    assert.deepEqual(
        ageGroupSchemas.createAgeGroupSchema.parse({ name: ' U12 ', age: '12' }),
        { name: 'U12', age: 12 },
    );
    assert.deepEqual(
        ageGroupSchemas.updateAgeGroupSchema.parse({ age: '14' }),
        { age: 14 },
    );
    assert.equal(
        ageGroupSchemas.createAgeGroupSchema.safeParse({ name: '', age: 12 }).success,
        false,
    );
    assert.equal(
        ageGroupSchemas.updateAgeGroupSchema.safeParse({}).success,
        false,
    );
});

test('coerces positive age-group IDs', () => {
    assert.deepEqual(
        ageGroupSchemas.ageGroupIdSchema.parse({ id: '7' }),
        { id: 7 },
    );
});
