const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const {
    seedFullTournament,
    seedAdditionalEligibleRegistrations,
    getPlayerAssignments,
} = require('../prisma/seedings/seed-full-tournament');

function createSeedContext() {
    const calls = {
        userCreates: [],
        userUpdates: [],
        profileUpserts: [],
        userCategoryUpserts: [],
        registrationCreates: [],
        registrationUpdates: [],
        paymentCreates: [],
        paymentUpdates: [],
        draftCreates: [],
        assignments: [],
        publishes: 0,
    };
    const users = new Map();
    const registrations = new Map();
    const payments = new Map();
    let nextUserId = 10;
    let nextRegistrationId = 100;
    let nextPaymentId = 200;
    let tournament = null;
    let tournamentCategory = null;
    let paymentProofExists = false;
    let latestDraw = null;

    const database = {
        user: {
            findUnique: async () => ({ id: 1, role: { name: 'admin' } }),
        },
        tournamentPayment: {
            findFirst: async () => {
                const payment = [...payments.values()][0];
                return payment ? { proofImageUrl: payment.proofImageUrl } : null;
            },
        },
        $transaction: async (callback) => callback({
            role: {
                upsert: async () => ({ id: 2 }),
            },
            category: {
                upsert: async () => ({ id: 3 }),
            },
            tournament: {
                findFirst: async () => (tournament ? { id: tournament.id } : null),
                create: async ({ data }) => {
                    tournament = { id: 4, data };
                    return { id: tournament.id };
                },
                update: async ({ where }) => ({ id: where.id }),
            },
            tournamentCategory: {
                findFirst: async () => (
                    tournamentCategory ? { id: tournamentCategory.id } : null
                ),
                create: async ({ data }) => {
                    tournamentCategory = { id: 5, data };
                    return { id: tournamentCategory.id };
                },
                update: async ({ where, data }) => {
                    tournamentCategory = { id: where.id, data };
                    return { id: where.id };
                },
            },
            tournamentDrawConfiguration: {
                upsert: async () => ({}),
            },
            categoryPointTier: {
                upsert: async () => ({}),
            },
            tournamentRegistrationStatus: {
                upsert: async () => ({ id: 6 }),
            },
            paymentMethod: {
                findFirst: async () => ({
                    id: 7,
                    paymentMethodName: 'NYX Seed Test Payment',
                    accountName: 'NYX Test Account',
                    accountNumber: 'TEST-NO-REAL-ACCOUNT',
                }),
                create: async () => assert.fail('Expected existing test payment method'),
            },
            user: {
                findUnique: async ({ where }) => users.get(where.email) ?? null,
                create: async ({ data }) => {
                    const user = {
                        id: nextUserId++,
                        name: data.name,
                        email: data.email,
                        role: { name: 'user' },
                    };
                    users.set(user.email, user);
                    calls.userCreates.push(data);
                    return { id: user.id };
                },
                update: async ({ where, data }) => {
                    calls.userUpdates.push(data);
                    return { id: where.id };
                },
            },
            userProfile: {
                upsert: async (args) => {
                    calls.profileUpserts.push(args);
                    return {};
                },
            },
            userCategory: {
                upsert: async (args) => {
                    calls.userCategoryUpserts.push(args);
                    return {};
                },
            },
            tournamentRegistration: {
                findFirst: async ({ where }) => {
                    for (const registration of registrations.values()) {
                        if (
                            registration.tournamentCategoryId === where.tournamentCategoryId
                            && registration.registeredBy === where.registeredBy
                        ) {
                            return { id: registration.id };
                        }
                    }
                    return null;
                },
                create: async ({ data }) => {
                    const registration = {
                        id: nextRegistrationId++,
                        tournamentCategoryId: data.tournamentCategoryId,
                        registeredBy: data.registeredBy,
                        members: [{ userId: data.registeredBy }],
                    };
                    registrations.set(registration.id, registration);
                    calls.registrationCreates.push(data);
                    return { id: registration.id };
                },
                update: async ({ where }) => {
                    calls.registrationUpdates.push(where.id);
                    return { id: where.id };
                },
            },
            tournamentRegistrationMember: {
                upsert: async () => ({}),
            },
            tournamentPayment: {
                findFirst: async ({ where }) => {
                    const payment = [...payments.values()].find((item) => (
                        item.registrationId === where.registrationId
                    ));
                    return payment ? { id: payment.id } : null;
                },
                create: async ({ data }) => {
                    const payment = { id: nextPaymentId++, ...data };
                    payments.set(payment.id, payment);
                    calls.paymentCreates.push(data);
                    paymentProofExists = true;
                    return payment;
                },
                update: async ({ where, data }) => {
                    Object.assign(payments.get(where.id), data);
                    calls.paymentUpdates.push(data);
                    return { id: where.id };
                },
            },
        }),
    };

    const proofStorage = {
        save: async () => {
            paymentProofExists = true;
            return '00000000-0000-4000-8000-000000000001.png';
        },
        read: async () => {
            if (!paymentProofExists) {
                const error = new Error('Missing test proof.');
                error.statusCode = 404;
                throw error;
            }
            return { buffer: Buffer.from('proof') };
        },
        remove: async () => {
            paymentProofExists = false;
        },
    };

    const drawRepository = {
        getLatestDraw: async () => {
            if (!latestDraw) {
                const error = new Error('No draw.');
                error.statusCode = 404;
                throw error;
            }
            return latestDraw;
        },
        createDraft: async (categoryId, configuration) => {
            calls.draftCreates.push({ categoryId, configuration });
            return { id: 300 };
        },
        assignPositions: async (drawId, assignments) => {
            calls.assignments.push({ drawId, assignments });
        },
        publish: async (drawId) => {
            calls.publishes += 1;
            latestDraw = {
                id: drawId,
                version: 1,
                status: 'PUBLISHED',
                configurationSnapshot: { bracketSize: 64 },
                participants: calls.assignments[0].assignments.map(({ registrationId }) => ({
                    registrationId,
                })),
            };
            return latestDraw;
        },
    };

    return {
        calls,
        database,
        drawRepository,
        proofStorage,
        get users() { return users; },
        get registrations() { return registrations; },
        get payments() { return payments; },
    };
}

const validEnvironment = {
    SEED_TEST_DATA: 'true',
    TEST_USERS_PASSWORD: 'strong-test-password',
    ADMIN_EMAIL: 'admin@example.com',
};

test('requires explicit opt-in, refuses production, and checks the admin before database writes', async () => {
    const context = createSeedContext();

    await assert.rejects(seedFullTournament(context.database, {
        ...validEnvironment,
        SEED_TEST_DATA: undefined,
    }), /SEED_TEST_DATA=true/);
    await assert.rejects(seedFullTournament(context.database, {
        ...validEnvironment,
        NODE_ENV: 'production',
    }), /cannot be seeded in production/);
    await assert.rejects(seedFullTournament({
        ...context.database,
        user: { findUnique: async () => null },
    }, validEnvironment), /existing administrator/);
    assert.equal(context.calls.userCreates.length, 0);
});

test('seeds 35 test players through paid registrations and a published 64-slot draw idempotently', async () => {
    const context = createSeedContext();
    const dependencies = {
        drawRepository: context.drawRepository,
        proofStorage: context.proofStorage,
    };

    const firstRun = await seedFullTournament(context.database, validEnvironment, dependencies);
    const secondRun = await seedFullTournament(context.database, validEnvironment, dependencies);

    assert.equal(firstRun.playerCount, 35);
    assert.equal(firstRun.registrationCount, 35);
    assert.equal(firstRun.bracketSize, 64);
    assert.equal(firstRun.drawId, 300);
    assert.equal(secondRun.drawId, firstRun.drawId);
    assert.equal(context.users.size, 35);
    assert.equal(context.registrations.size, 35);
    assert.equal(context.payments.size, 35);
    assert.equal(context.calls.userCreates.length, 35);
    assert.equal(context.calls.registrationCreates.length, 35);
    assert.equal(context.calls.paymentCreates.length, 35);
    assert.equal(context.calls.paymentUpdates.length, 35);
    assert.equal(context.calls.draftCreates.length, 1);
    assert.equal(context.calls.publishes, 1);
    assert.ok(context.calls.paymentCreates.every(({ status, verifiedBy, proofImageUrl }) => (
        status === 'paid' && verifiedBy === 1 && proofImageUrl.endsWith('.png')
    )));
    assert.ok(context.calls.profileUpserts.every(({ create }) => (
        create.gender === 'male' && create.birthday instanceof Date
    )));
    assert.equal(
        await bcrypt.compare(validEnvironment.TEST_USERS_PASSWORD, context.calls.userCreates[0].passwordHash),
        true,
    );

    const assignments = context.calls.assignments[0].assignments;
    assert.equal(assignments.length, 35);
    assert.equal(new Set(assignments.map(({ registrationId }) => registrationId)).size, 35);
    assert.equal(new Set(assignments.map(({ bracketPosition }) => bracketPosition)).size, 35);
    const assignedPositions = new Set(assignments.map(({ bracketPosition }) => bracketPosition));
    const byeMatches = Array.from({ length: 32 }, (_, index) => {
        const firstSlot = assignedPositions.has(index * 2 + 1);
        const secondSlot = assignedPositions.has(index * 2 + 2);
        return firstSlot !== secondSlot;
    }).filter(Boolean);
    assert.equal(byeMatches.length, 29);
});

test('seeds 15 additional confirmed paid registrations without creating a draw', async () => {
    const context = createSeedContext();
    const result = await seedAdditionalEligibleRegistrations(
        context.database,
        validEnvironment,
        {
            drawRepository: context.drawRepository,
            proofStorage: context.proofStorage,
        },
    );

    assert.equal(result.tournamentCategoryId, 5);
    assert.equal(result.playerCount, 15);
    assert.equal(result.registrationCount, 15);
    assert.equal(result.drawId, null);
    assert.equal(result.drawVersion, null);
    assert.equal(result.bracketSize, null);
    assert.equal(result.testUserEmailRange, 'nyx.seed.player.36@example.test through nyx.seed.player.50@example.test');
    assert.equal(context.users.size, 15);
    assert.equal(context.registrations.size, 15);
    assert.equal(context.payments.size, 15);
    assert.equal(context.calls.registrationCreates.length, 15);
    assert.ok(context.calls.paymentCreates.every(({ status }) => status === 'paid'));
    assert.equal(context.calls.draftCreates.length, 0);
    assert.equal(context.calls.assignments.length, 0);
    assert.equal(context.calls.publishes, 0);
});

test('balances byes across first-round matches when generating positions', () => {
    const assignments = getPlayerAssignments(Array.from({ length: 35 }, (_, index) => index + 1));
    const positions = new Set(assignments.map(({ bracketPosition }) => bracketPosition));

    assert.equal(assignments.length, 35);
    assert.equal(positions.size, 35);
    assert.equal(positions.has(1), true);
    assert.equal(positions.has(2), false);
    assert.equal(positions.has(57), true);
    assert.equal(positions.has(58), false);
    assert.equal(positions.has(59), true);
    assert.equal(positions.has(64), true);
});
