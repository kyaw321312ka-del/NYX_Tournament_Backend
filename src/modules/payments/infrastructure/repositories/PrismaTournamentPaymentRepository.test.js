const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaTournamentPaymentRepository = require('./PrismaTournamentPaymentRepository');

function paymentRecord(overrides = {}) {
    return {
        id: 11,
        registrationId: 7,
        paymentMethodId: 4,
        paymentMethodName: 'K Pay',
        accountName: 'NYX Tournament',
        accountNumber: '09XXXXXXXXX',
        amount: '50000.00',
        currency: 'MMK',
        proofImageUrl: 'd2b79856-68d9-4c24-8e74-2cc993d5ec6f.png',
        transactionReference: 'TX-123',
        status: 'submitted',
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
        createdAt: new Date('2026-11-09T00:00:00Z'),
        updatedAt: new Date('2026-11-09T00:00:00Z'),
        registration: {
            id: 7,
            registeredBy: 5,
            registeredAt: new Date('2026-11-08T00:00:00Z'),
            status: { name: 'pending' },
            category: {
                id: 3,
                categoryCode: 'MS',
                categoryName: 'Men Singles',
                entryFee: '50000.00',
                tournament: { id: 2, title: 'NYX Open' },
            },
            creator: { id: 5, name: 'Player', email: 'player@example.com' },
            members: [],
        },
        ...overrides,
    };
}

function createSubmitRepository({ registration, existing = null } = {}) {
    const calls = { create: [], registrationLock: false, methodLock: false };
    const transaction = {
        $queryRaw: async (strings) => {
            if (strings.join('').includes('payment_methods')) calls.methodLock = true;
            else calls.registrationLock = true;
            return [{ id: 7 }];
        },
        paymentMethod: {
            findUnique: async () => ({
                id: 4,
                paymentMethodName: 'K Pay',
                accountName: 'NYX Tournament',
                accountNumber: '09XXXXXXXXX',
                isActive: true,
            }),
        },
        tournamentRegistration: {
            findUnique: async () => registration ?? {
                registeredBy: 5,
                status: { name: 'pending' },
                category: { entryFee: '50000.00' },
            },
        },
        tournamentPayment: {
            findFirst: async ({ where }) => (
                existing && where.status.in.includes(existing.status) ? existing : null
            ),
            create: async (args) => {
                calls.create.push(args);
                return paymentRecord({
                    ...args.data,
                });
            },
        },
    };
    const repository = new PrismaTournamentPaymentRepository({
        $transaction: async (callback) => callback(transaction),
    });
    return { repository, calls };
}

test('snapshots category entry fee and creates a submitted payment', async () => {
    const { repository, calls } = createSubmitRepository();
    const payment = await repository.submit({
        userId: 5,
        registrationId: 7,
        paymentMethodId: 4,
        proofImageUrl: 'proof.png',
        transactionReference: 'TX-123',
    });

    assert.equal(payment.status, 'submitted');
    assert.equal(payment.toJSON().amount, '50000.00');
    assert.equal(payment.toJSON().proofImageUrl, '/api/admin/payments/11/proof');
    assert.equal(payment.toJSON().paymentMethodName, 'K Pay');
    assert.equal(payment.toJSON().accountName, 'NYX Tournament');
    assert.equal(calls.registrationLock, true);
    assert.equal(calls.methodLock, true);
    assert.equal(calls.create[0].data.amount, '50000.00');
    assert.equal(calls.create[0].data.paymentMethodId, 4);
    assert.equal(calls.create[0].data.accountNumber, '09XXXXXXXXX');
});

test('allows only the registration creator and prevents duplicate active payments', async (t) => {
    await t.test('rejects a non-creator', async () => {
        const { repository, calls } = createSubmitRepository({
            registration: {
                registeredBy: 8,
                status: { name: 'pending' },
                category: { entryFee: '50000.00' },
            },
        });
        await assert.rejects(
            repository.submit({ userId: 5, registrationId: 7, paymentMethodId: 4, proofImageUrl: 'proof.png' }),
            (error) => error.statusCode === 403,
        );
        assert.equal(calls.create.length, 0);
    });

    for (const status of ['submitted', 'paid']) {
        await t.test(`rejects another ${status} payment`, async () => {
            const { repository, calls } = createSubmitRepository({
                existing: { id: 10, status },
            });
            await assert.rejects(
                repository.submit({ userId: 5, registrationId: 7, paymentMethodId: 4, proofImageUrl: 'proof.png' }),
                (error) => error.statusCode === 409,
            );
            assert.equal(calls.create.length, 0);
        });
    }

    await t.test('allows a new submission after a rejected payment', async () => {
        const { repository, calls } = createSubmitRepository({
            existing: { id: 10, status: 'rejected' },
        });
        const payment = await repository.submit({
            userId: 5,
            registrationId: 7,
            paymentMethodId: 4,
            proofImageUrl: 'new-proof.png',
        });
        assert.equal(payment.status, 'submitted');
        assert.equal(calls.create.length, 1);
    });
});

test('rejects inactive payment methods before creating a payment', async () => {
    const calls = { create: [] };
    const repository = new PrismaTournamentPaymentRepository({
        $transaction: async (callback) => callback({
            $queryRaw: async () => [{ id: 7 }],
            tournamentRegistration: {
                findUnique: async () => ({
                    registeredBy: 5,
                    status: { name: 'pending' },
                    category: { entryFee: '50000.00' },
                }),
            },
            paymentMethod: {
                findUnique: async () => ({ id: 4, isActive: false }),
            },
            tournamentPayment: {
                findFirst: async () => null,
                create: async (args) => calls.create.push(args),
            },
        }),
    });

    await assert.rejects(
        repository.submit({
            userId: 5,
            registrationId: 7,
            paymentMethodId: 4,
            proofImageUrl: 'proof.png',
        }),
        (error) => error.statusCode === 409 && /inactive/.test(error.message),
    );
    assert.equal(calls.create.length, 0);
});

function createReviewRepository({ payment = paymentRecord(), previouslyPaid = null } = {}) {
    const calls = { registrationUpdate: [], paymentUpdate: [], locks: 0 };
    const transaction = {
        $queryRaw: async () => {
            calls.locks += 1;
            return [{ id: 7 }];
        },
        tournamentPayment: {
            findUnique: async ({ select }) => (select ? { registrationId: 7 } : payment),
            findFirst: async () => previouslyPaid,
            update: async (args) => {
                calls.paymentUpdate.push(args);
                return paymentRecord({
                    status: args.data.status,
                    verifiedBy: args.data.verifiedBy,
                    verifiedAt: args.data.verifiedAt,
                    rejectionReason: args.data.rejectionReason,
                });
            },
        },
        tournamentRegistrationStatus: {
            upsert: async () => ({ id: 4, name: 'confirmed' }),
        },
        tournamentRegistration: {
            update: async (args) => calls.registrationUpdate.push(args),
        },
    };
    const repository = new PrismaTournamentPaymentRepository({
        $transaction: async (callback) => callback(transaction),
    });
    return { repository, calls };
}

test('approval marks payment paid and registration confirmed in the same transaction', async () => {
    const { repository, calls } = createReviewRepository();
    const payment = await repository.review({
        adminId: 1,
        paymentId: 11,
        decision: 'approve',
    });

    assert.equal(payment.status, 'paid');
    assert.equal(calls.locks, 1);
    assert.deepEqual(calls.registrationUpdate, [{
        where: { id: 7 },
        data: { statusId: 4 },
    }]);
    assert.equal(calls.paymentUpdate[0].data.status, 'paid');
    assert.equal(calls.paymentUpdate[0].data.verifiedBy, 1);
});

test('rejection records reason and reviewer without confirming registration', async () => {
    const { repository, calls } = createReviewRepository();
    const payment = await repository.review({
        adminId: 1,
        paymentId: 11,
        decision: 'reject',
        rejectionReason: 'Amount does not match.',
    });

    assert.equal(payment.status, 'rejected');
    assert.equal(payment.rejectionReason, 'Amount does not match.');
    assert.equal(calls.registrationUpdate.length, 0);
    assert.equal(calls.paymentUpdate[0].data.verifiedBy, 1);
});

test('prevents a second payment from being approved for the same registration', async () => {
    const { repository, calls } = createReviewRepository({
        previouslyPaid: { id: 10 },
    });
    await assert.rejects(
        repository.review({ adminId: 1, paymentId: 11, decision: 'approve' }),
        (error) => error.statusCode === 409,
    );
    assert.equal(calls.paymentUpdate.length, 0);
    assert.equal(calls.registrationUpdate.length, 0);
});
