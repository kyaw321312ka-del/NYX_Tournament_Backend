const test = require('node:test');
const assert = require('node:assert/strict');
const PrismaRegistrationRepository = require('./PrismaRegistrationRepository');

const category = {
    id: 5,
    tournamentId: 9,
    categoryCode: 'MD',
    categoryName: 'Men Doubles',
    pairingType: 'doubles',
    entryStatus: 'open',
    tournament: { id: 9, title: 'NYX Open', publicationStatus: 'published' },
};
const inviter = {
    id: 10,
    name: 'Player A',
    email: 'playera@example.com',
    gender: 'male',
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
};
const invitedUser = {
    id: 15,
    name: 'Player B',
    email: 'playerb@example.com',
    gender: 'male',
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
};

function createRepository({
    selectedCategory = category,
    selectedInviter = inviter,
    selectedInvitedUser = invitedUser,
    selectedInvitation = null,
    existingRegistration = null,
    existingPendingInvitation = null,
    transactionError = null,
} = {}) {
    const calls = {
        category: [],
        locks: [],
        user: [],
        registrations: [],
        invitations: [],
        invitationCreates: [],
        registrationCreates: [],
        invitationUpdates: [],
        transactionOptions: [],
    };
    const transaction = {
        $queryRaw: async (strings, ...values) => {
            const query = strings.join('?');
            calls.locks.push({ query, values });
            if (query.includes('tournament_partner_invitations')) {
                return selectedInvitation
                    ? [{ tournamentCategoryId: selectedInvitation.tournamentCategoryId }]
                    : [];
            }
            return [{ id: values[0] }];
        },
        tournamentCategory: {
            findUnique: async (args) => {
                calls.category.push(args);
                return selectedCategory;
            },
        },
        user: {
            findUnique: async (args) => {
                calls.user.push(args);
                if (args.where.id) return selectedInviter;
                return selectedInvitedUser;
            },
        },
        tournamentRegistration: {
            findFirst: async (args) => {
                calls.registrations.push(args);
                const activeStatuses = args.where.status?.is?.name?.in ?? [];
                return existingRegistration && activeStatuses.includes(existingRegistration.status)
                    ? existingRegistration
                    : null;
            },
            create: async (args) => {
                calls.registrationCreates.push(args);
                return {
                    id: 22,
                    tournamentCategoryId: args.data.tournamentCategoryId,
                    registeredBy: args.data.registeredBy,
                    statusId: args.data.statusId,
                    registeredAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-01T00:00:00Z'),
                    category: selectedCategory,
                    creator: { id: args.data.registeredBy, name: inviter.name },
                    status: { id: args.data.statusId, name: 'pending' },
                    members: args.data.members.create.map(({ userId }) => ({
                        id: userId,
                        userId,
                        tournamentCategoryId: args.data.tournamentCategoryId,
                        user: {
                            id: userId,
                            name: userId === inviter.id ? inviter.name : invitedUser.name,
                            email: userId === inviter.id ? inviter.email : invitedUser.email,
                        },
                    })),
                };
            },
        },
        tournamentRegistrationStatus: {
            upsert: async () => ({ id: 3, name: 'pending' }),
        },
        tournamentPartnerInvitation: {
            findFirst: async (args) => {
                calls.invitations.push(args);
                return calls.invitations.length === 1
                    ? existingPendingInvitation
                    : null;
            },
            findUnique: async () => selectedInvitation,
            create: async (args) => {
                calls.invitationCreates.push(args);
                return {
                    id: 31,
                    ...args.data,
                    status: 'pending',
                    respondedAt: null,
                    registrationId: null,
                    createdAt: new Date('2026-01-01T00:00:00Z'),
                    updatedAt: new Date('2026-01-01T00:00:00Z'),
                    category: selectedCategory,
                    inviter,
                    invitedUser,
                };
            },
            update: async ({ data }) => {
                calls.invitationUpdates.push({ data });
                return { ...selectedInvitation, ...data };
            },
            updateMany: async (args) => {
                calls.invitationUpdates.push(args);
                return { count: 1 };
            },
        },
    };
    const prisma = {
        $transaction: async (callback, options) => {
            calls.transactionOptions.push(options);
            if (transactionError) throw transactionError;
            return callback(transaction);
        },
    };

    return {
        repository: new PrismaRegistrationRepository(prisma),
        calls,
    };
}

test('creates a verified doubles partner invitation with a 48-hour expiry', async () => {
    const { repository, calls } = createRepository();
    const before = Date.now();

    const invitation = await repository.createPartnerInvitation({
        userId: inviter.id,
        tournamentCategoryId: category.id,
        partnerEmail: 'PLAYERB@example.com',
    });

    assert.equal(invitation.status, 'pending');
    assert.equal(invitation.invitedBy, inviter.id);
    assert.equal(invitation.invitedUserId, invitedUser.id);
    assert.equal(invitation.inviter.email, inviter.email);
    assert.equal(invitation.invitedUser.email, invitedUser.email);
    assert.ok(invitation.expiresAt.getTime() >= before + 48 * 60 * 60 * 1000);
    assert.deepEqual(calls.invitationCreates[0].data, {
        tournamentCategoryId: category.id,
        invitedBy: inviter.id,
        invitedUserId: invitedUser.id,
        expiresAt: invitation.expiresAt,
    });
    assert.equal(calls.transactionOptions[0].isolationLevel, 'Serializable');
});

test('rejects unverified invitees, self-invites, and already-registered players', async (t) => {
    const cases = [
        {
            name: 'unverified invitee',
            selectedInvitedUser: { ...invitedUser, emailVerifiedAt: null },
            message: /verify their email/,
            statusCode: 409,
        },
        {
            name: 'self-invite',
            selectedInvitedUser: inviter,
            message: /cannot invite yourself/,
            statusCode: 400,
        },
        {
            name: 'existing registration',
            existingRegistration: { id: 14, status: 'confirmed' },
            message: /already registered/,
            statusCode: 409,
        },
    ];

    for (const scenario of cases) {
        await t.test(scenario.name, async () => {
            const { repository, calls } = createRepository(scenario);

            await assert.rejects(
                repository.createPartnerInvitation({
                    userId: inviter.id,
                    tournamentCategoryId: category.id,
                    partnerEmail: invitedUser.email,
                }),
                (error) => error.statusCode === scenario.statusCode
                    && scenario.message.test(error.message),
            );
            assert.equal(calls.invitationCreates.length, 0);
        });
    }
});

test('accepting an invitation creates the pending registration and both members atomically', async () => {
    const invitation = {
        id: 31,
        tournamentCategoryId: category.id,
        invitedBy: inviter.id,
        invitedUserId: invitedUser.id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        category,
        inviter,
        invitedUser,
    };
    const { repository, calls } = createRepository({ selectedInvitation: invitation });

    const registration = await repository.acceptPartnerInvitation(invitedUser.id, invitation.id);

    assert.equal(registration.registeredBy, inviter.id);
    assert.equal(registration.status.name, 'pending');
    assert.deepEqual(registration.members.map(({ userId }) => userId), [inviter.id, invitedUser.id]);
    assert.equal(calls.registrationCreates.length, 1);
    assert.deepEqual(calls.registrationCreates[0].data.members.create, [
        { userId: inviter.id },
        { userId: invitedUser.id },
    ]);
    assert.equal(calls.registrationCreates[0].data.registeredBy, inviter.id);
    assert.deepEqual(calls.invitationUpdates[0].data, {
        status: 'accepted',
        respondedAt: calls.invitationUpdates[0].data.respondedAt,
        registrationId: 22,
    });
    assert.equal(calls.transactionOptions[0].isolationLevel, 'Serializable');
    assert.match(calls.locks[0].query, /tournament_partner_invitations/);
    assert.match(calls.locks[1].query, /tournament_categories/);
});

test('maps category participation uniqueness conflicts when accepting an invitation', async () => {
    const invitation = {
        id: 31,
        tournamentCategoryId: category.id,
        invitedBy: inviter.id,
        invitedUserId: invitedUser.id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        category,
        inviter,
        invitedUser,
    };
    const { repository } = createRepository({
        selectedInvitation: invitation,
        transactionError: { code: 'P2002' },
    });

    test('enforces mixed-gender eligibility when accepting a mixed-doubles invitation', async () => {
        const mixedCategory = {
            ...category,
            categoryCode: 'XD',
            pairingType: 'mixed_doubles',
        };
        const invitation = {
            id: 31,
            tournamentCategoryId: mixedCategory.id,
            invitedBy: inviter.id,
            invitedUserId: invitedUser.id,
            status: 'pending',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            category: mixedCategory,
            inviter,
            invitedUser: { ...invitedUser, gender: 'female' },
        };
        const { repository, calls } = createRepository({
            selectedCategory: mixedCategory,
            selectedInvitation: invitation,
            selectedInvitedUser: invitation.invitedUser,
        });

        const registration = await repository.acceptPartnerInvitation(invitedUser.id, invitation.id);

        assert.deepEqual(registration.members.map(({ userId }) => userId), [inviter.id, invitedUser.id]);
        assert.deepEqual(
            registration.members.map(({ tournamentCategoryId }) => tournamentCategoryId),
            [mixedCategory.id, mixedCategory.id],
        );
    });

    test('rejects same-gender players accepting mixed-doubles invitations', async () => {
        const mixedCategory = {
            ...category,
            categoryCode: 'XD',
            pairingType: 'mixed_doubles',
        };
        const invitation = {
            id: 31,
            tournamentCategoryId: mixedCategory.id,
            invitedBy: inviter.id,
            invitedUserId: invitedUser.id,
            status: 'pending',
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            category: mixedCategory,
            inviter,
            invitedUser,
        };
        const { repository, calls } = createRepository({
            selectedCategory: mixedCategory,
            selectedInvitation: invitation,
        });

        await assert.rejects(
            repository.acceptPartnerInvitation(invitedUser.id, invitation.id),
            (error) => error.statusCode === 400 && /gender eligibility/.test(error.message),
        );
        assert.equal(calls.registrationCreates.length, 0);
    });

    await assert.rejects(
        repository.acceptPartnerInvitation(invitedUser.id, invitation.id),
        (error) => error.statusCode === 409 && /already registered/.test(error.message),
    );
});

test('only the invited player may accept and expired invitations are marked expired', async (t) => {
    const unexpiredInvitation = {
        id: 31,
        tournamentCategoryId: category.id,
        invitedBy: inviter.id,
        invitedUserId: invitedUser.id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        category,
        inviter,
        invitedUser,
    };
    await t.test('rejects inviter acceptance', async () => {
        const { repository, calls } = createRepository({ selectedInvitation: unexpiredInvitation });

        await assert.rejects(
            repository.acceptPartnerInvitation(inviter.id, unexpiredInvitation.id),
            (error) => error.statusCode === 403,
        );
        assert.equal(calls.registrationCreates.length, 0);
    });

    await t.test('expires stale invitation without creating registration', async () => {
        const expiredInvitation = {
            ...unexpiredInvitation,
            expiresAt: new Date(Date.now() - 60 * 1000),
        };
        const { repository, calls } = createRepository({ selectedInvitation: expiredInvitation });

        await assert.rejects(
            repository.acceptPartnerInvitation(invitedUser.id, expiredInvitation.id),
            (error) => error.statusCode === 410,
        );
        assert.equal(calls.registrationCreates.length, 0);
        assert.equal(calls.invitationUpdates[0].data.status, 'expired');
    });
});
