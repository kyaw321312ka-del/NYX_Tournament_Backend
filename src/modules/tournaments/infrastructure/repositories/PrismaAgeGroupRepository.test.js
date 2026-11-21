const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaAgeGroupRepository = require('./PrismaAgeGroupRepository');

test('lists age groups by age and supports create and update', async () => {
    const calls = [];
    const groups = new Map([
        [1, { id: 1, name: 'U10', age: 10 }],
        [2, { id: 2, name: 'U12', age: 12 }],
    ]);
    const prisma = {
        ageGroup: {
            findMany: async (args) => {
                calls.push(['findMany', args]);
                return [...groups.values()];
            },
            findUnique: async ({ where }) => (
                where.id ? groups.get(where.id) ?? null
                    : [...groups.values()].find((group) => (
                        group.name === where.name_age.name && group.age === where.name_age.age
                    )) ?? null
            ),
            findFirst: async ({ where }) => [...groups.values()].find((group) => (
                group.name === where.name
                && group.age === where.age
                && group.id !== where.id.not
            )) ?? null,
            create: async ({ data }) => {
                const group = { id: 3, ...data };
                groups.set(group.id, group);
                return group;
            },
            update: async ({ where, data }) => {
                const group = { ...groups.get(where.id), ...data };
                groups.set(where.id, group);
                return group;
            },
        },
        tournamentCategory: {
            count: async () => 0,
        },
    };
    const repository = new PrismaAgeGroupRepository(prisma);

    const listed = await repository.list();
    assert.deepEqual(listed, [...groups.values()]);
    assert.deepEqual(calls[0][1].orderBy, [{ age: 'asc' }, { id: 'asc' }]);

    const created = await repository.create({ name: 'U14', age: 14 });
    assert.deepEqual(created, { id: 3, name: 'U14', age: 14 });

    const updated = await repository.update(1, { age: 11 });
    assert.deepEqual(updated, { id: 1, name: 'U10', age: 11 });
});

test('rejects duplicate or in-use age groups', async () => {
    const prisma = {
        ageGroup: {
            findUnique: async ({ where }) => (
                where.id === 1
                    ? { id: 1, name: 'U10', age: 10 }
                    : { id: 2, name: 'U12', age: 12 }
            ),
            findFirst: async () => ({ id: 2, name: 'U12', age: 12 }),
            delete: async () => assert.fail('Used age groups must not be deleted'),
        },
        tournamentCategory: {
            count: async () => 3,
        },
    };
    const repository = new PrismaAgeGroupRepository(prisma);

    await assert.rejects(
        repository.create({ name: 'U12', age: 12 }),
        (error) => error.statusCode === 409,
    );
    await assert.rejects(
        repository.update(1, { name: 'U12', age: 12 }),
        (error) => error.statusCode === 409,
    );
    await assert.rejects(
        repository.remove(1),
        (error) => error.statusCode === 409,
    );
});
