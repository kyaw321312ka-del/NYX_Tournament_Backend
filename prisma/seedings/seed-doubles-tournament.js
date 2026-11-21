require('dotenv').config();

const bcrypt = require('bcryptjs');
const LocalPaymentProofStorage = require('../../src/modules/payments/infrastructure/services/LocalPaymentProofStorage');
const SingleEliminationGenerator = require('../../src/modules/draws/domain/services/SingleEliminationGenerator');
const PrismaTournamentDrawRepository = require('../../src/modules/draws/infrastructure/repositories/PrismaTournamentDrawRepository');
const prisma = require('../../src/shared/database/prisma');
const {
    validateEnvironment,
    getPaymentProof,
    getPlayerAssignments,
    TOURNAMENT_TITLE,
    PAYMENT_METHOD_NAME,
} = require('./seed-full-tournament');
const { seedMatchResults } = require('./seed-match-results');

const TEAM_COUNT = 15;
const CATEGORY_CODE = 'MD';
const CATEGORY_NAME = "Men's Doubles";
const PAYMENT_PROOF = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
    'base64',
);

function getTestDoublesTeams(teamCount = TEAM_COUNT) {
    return Array.from({ length: teamCount }, (_, teamIndex) => (
        Array.from({ length: 2 }, (_, partnerIndex) => {
            const playerNumber = teamIndex * 2 + partnerIndex + 1;
            const number = String(playerNumber).padStart(2, '0');
            return {
                name: `NYX Seed Doubles Player ${number}`,
                email: `nyx.seed.doubles.player.${number}@example.test`,
                phno: `+959010000${String(playerNumber).padStart(3, '0')}`,
                gender: 'male',
                birthday: new Date(Date.UTC(1990 + ((playerNumber - 1) % 10), 0, 1)),
                clubName: `Seed Doubles Club ${String((teamIndex % 5) + 1).padStart(2, '0')}`,
            };
        })
    ));
}

async function seedDoublesTournament(database, env, dependencies = {}, options = {}) {
    const { adminEmail, password } = validateEnvironment(env);
    const admin = await database.user.findUnique({
        where: { email: adminEmail },
        select: { id: true, role: { select: { name: true } } },
    });
    if (!admin || admin.role?.name !== 'admin') {
        throw new Error('ADMIN_EMAIL must belong to an existing administrator account.');
    }

    const tournament = await database.tournament.findFirst({
        where: { createdBy: admin.id, title: TOURNAMENT_TITLE },
        select: { id: true },
    });
    if (!tournament) {
        throw new Error('Run the full tournament seeder before seeding doubles registrations.');
    }

    const proofStorage = dependencies.proofStorage ?? new LocalPaymentProofStorage();
    const proof = await getPaymentProof(proofStorage, database);
    const passwordHash = await bcrypt.hash(password, 12);
    const teams = getTestDoublesTeams();
    let seeded;

    try {
        seeded = await database.$transaction(async (transaction) => {
            const userRole = await transaction.role.upsert({
                where: { name: 'user' },
                create: { name: 'user' },
                update: {},
            });
            const category = await transaction.category.upsert({
                where: { categoryCode: CATEGORY_CODE },
                create: {
                    categoryCode: CATEGORY_CODE,
                    name: CATEGORY_NAME,
                    pairingType: 'doubles',
                },
                update: {
                    name: CATEGORY_NAME,
                    pairingType: 'doubles',
                },
            });
            const existingCategory = await transaction.tournamentCategory.findFirst({
                where: {
                    tournamentId: tournament.id,
                    categoryId: category.id,
                    ageGroupId: null,
                },
                select: { id: true },
            });
            const tournamentCategoryData = {
                entryFee: 10000,
                matchFormat: 'Best of 3 games',
                entryStatus: 'open',
                pointsToWin: 21,
                winningMargin: 2,
                maxPoints: 30,
                gamesToWin: 2,
            };
            const tournamentCategory = existingCategory
                ? await transaction.tournamentCategory.update({
                    where: { id: existingCategory.id },
                    data: tournamentCategoryData,
                    select: { id: true },
                })
                : await transaction.tournamentCategory.create({
                    data: {
                        tournamentId: tournament.id,
                        categoryId: category.id,
                        ageGroupId: null,
                        ...tournamentCategoryData,
                    },
                    select: { id: true },
                });

            await transaction.tournamentDrawConfiguration.upsert({
                where: { tournamentCategoryId: tournamentCategory.id },
                create: {
                    tournamentCategoryId: tournamentCategory.id,
                    drawFormat: 'SINGLE_ELIMINATION',
                    seedingMethod: 'MANUAL',
                },
                update: {
                    drawFormat: 'SINGLE_ELIMINATION',
                    seedingMethod: 'MANUAL',
                },
            });
            for (const tier of [
                { position: 1, label: 'Champion', points: 1000 },
                { position: 2, label: 'Runner-up', points: 600 },
                { position: 3, label: 'Semi-finalist', points: 300 },
            ]) {
                await transaction.categoryPointTier.upsert({
                    where: {
                        tournamentCategoryId_position: {
                            tournamentCategoryId: tournamentCategory.id,
                            position: tier.position,
                        },
                    },
                    create: { tournamentCategoryId: tournamentCategory.id, ...tier },
                    update: { label: tier.label, points: tier.points },
                });
            }

            const confirmedStatus = await transaction.tournamentRegistrationStatus.upsert({
                where: { name: 'confirmed' },
                create: { name: 'confirmed' },
                update: {},
                select: { id: true },
            });
            let paymentMethod = await transaction.paymentMethod.findFirst({
                where: {
                    paymentMethodName: PAYMENT_METHOD_NAME,
                    accountName: 'NYX Test Account',
                    accountNumber: 'TEST-NO-REAL-ACCOUNT',
                },
                select: {
                    id: true,
                    paymentMethodName: true,
                    accountName: true,
                    accountNumber: true,
                },
            });
            if (!paymentMethod) {
                paymentMethod = await transaction.paymentMethod.create({
                    data: {
                        paymentMethodName: PAYMENT_METHOD_NAME,
                        accountName: 'NYX Test Account',
                        accountNumber: 'TEST-NO-REAL-ACCOUNT',
                        isActive: true,
                    },
                    select: {
                        id: true,
                        paymentMethodName: true,
                        accountName: true,
                        accountNumber: true,
                    },
                });
            }

            const playersByEmail = new Map();
            for (const player of teams.flat()) {
                let user = await transaction.user.findUnique({
                    where: { email: player.email },
                    select: {
                        id: true,
                        name: true,
                        role: { select: { name: true } },
                    },
                });
                if (user && (user.name !== player.name || user.role?.name !== 'user')) {
                    throw new Error(`Refusing to modify an account outside the test seed: ${player.email}`);
                }

                user = user
                    ? await transaction.user.update({
                        where: { id: user.id },
                        data: {
                            name: player.name,
                            phno: player.phno,
                            passwordHash,
                            emailVerifiedAt: new Date(),
                        },
                        select: { id: true },
                    })
                    : await transaction.user.create({
                        data: {
                            roleId: userRole.id,
                            name: player.name,
                            email: player.email,
                            phno: player.phno,
                            passwordHash,
                            emailVerifiedAt: new Date(),
                        },
                        select: { id: true },
                    });

                await transaction.userProfile.upsert({
                    where: { userId: user.id },
                    create: {
                        userId: user.id,
                        gender: player.gender,
                        birthday: player.birthday,
                        address: 'Development test address',
                        clubName: player.clubName,
                    },
                    update: {
                        gender: player.gender,
                        birthday: player.birthday,
                        address: 'Development test address',
                        clubName: player.clubName,
                    },
                });
                await transaction.userCategory.upsert({
                    where: {
                        userId_categoryId: {
                            userId: user.id,
                            categoryId: category.id,
                        },
                    },
                    create: { userId: user.id, categoryId: category.id },
                    update: {},
                });
                playersByEmail.set(player.email, user.id);
            }

            const registrationIds = [];
            for (const [firstPlayer, secondPlayer] of teams) {
                const firstPlayerId = playersByEmail.get(firstPlayer.email);
                const secondPlayerId = playersByEmail.get(secondPlayer.email);
                let registration = await transaction.tournamentRegistration.findFirst({
                    where: {
                        tournamentCategoryId: tournamentCategory.id,
                        registeredBy: firstPlayerId,
                        members: { some: { userId: secondPlayerId } },
                    },
                    select: { id: true },
                });
                registration = registration
                    ? await transaction.tournamentRegistration.update({
                        where: { id: registration.id },
                        data: { statusId: confirmedStatus.id },
                        select: { id: true },
                    })
                    : await transaction.tournamentRegistration.create({
                        data: {
                            tournamentCategoryId: tournamentCategory.id,
                            registeredBy: firstPlayerId,
                            statusId: confirmedStatus.id,
                            members: {
                                create: [
                                    { userId: firstPlayerId },
                                    { userId: secondPlayerId },
                                ],
                            },
                        },
                        select: { id: true },
                    });

                for (const userId of [firstPlayerId, secondPlayerId]) {
                    await transaction.tournamentRegistrationMember.upsert({
                        where: {
                            registrationId_userId: {
                                registrationId: registration.id,
                                userId,
                            },
                        },
                        create: {
                            registrationId: registration.id,
                            tournamentCategoryId: tournamentCategory.id,
                            userId,
                        },
                        update: {},
                    });
                }

                const paymentData = {
                    paymentMethodName: paymentMethod.paymentMethodName,
                    accountName: paymentMethod.accountName,
                    accountNumber: paymentMethod.accountNumber,
                    amount: 10000,
                    currency: 'MMK',
                    proofImageUrl: proof.filename,
                    transactionReference: `NYX-SEED-MD-${registration.id}`,
                    status: 'paid',
                    verifiedBy: admin.id,
                    verifiedAt: new Date(),
                };
                const payment = await transaction.tournamentPayment.findFirst({
                    where: {
                        registrationId: registration.id,
                        paymentMethodId: paymentMethod.id,
                    },
                    select: { id: true },
                });
                if (payment) {
                    await transaction.tournamentPayment.update({
                        where: { id: payment.id },
                        data: paymentData,
                    });
                } else {
                    await transaction.tournamentPayment.create({
                        data: {
                            registrationId: registration.id,
                            paymentMethodId: paymentMethod.id,
                            ...paymentData,
                        },
                    });
                }
                registrationIds.push(registration.id);
            }

            return {
                tournamentId: tournament.id,
                tournamentCategoryId: tournamentCategory.id,
                registrationIds,
            };
        });
    } catch (error) {
        if (proof.created) {
            await proofStorage.remove(proof.filename);
        }
        throw error;
    }

    let draw = null;
    let matchResults = null;
    if (options.createDraw) {
        const drawRepository = dependencies.drawRepository
            ?? new PrismaTournamentDrawRepository(database, new SingleEliminationGenerator());
        let latestDraw = null;
        try {
            latestDraw = await drawRepository.getLatestDraw(seeded.tournamentCategoryId);
        } catch (error) {
            if (error.statusCode !== 404) throw error;
        }

        const expectedRegistrationIds = new Set(seeded.registrationIds);
        const currentPublishedDrawIsComplete = latestDraw?.status === 'PUBLISHED'
            && latestDraw.configurationSnapshot?.eligibleRegistrationIds?.length === TEAM_COUNT
            && latestDraw.participants?.length === TEAM_COUNT
            && latestDraw.participants.every(({ registrationId }) => (
                expectedRegistrationIds.has(registrationId)
            ));
        if (currentPublishedDrawIsComplete) {
            draw = latestDraw;
        } else {
            const draftHasSameRegistrations = latestDraw?.status === 'DRAFT'
                && latestDraw.configurationSnapshot?.eligibleRegistrationIds?.length === TEAM_COUNT
                && latestDraw.configurationSnapshot.eligibleRegistrationIds.every(
                    (registrationId) => expectedRegistrationIds.has(registrationId),
                );
            const draft = draftHasSameRegistrations
                ? latestDraw
                : await drawRepository.createDraft(seeded.tournamentCategoryId, {
                    drawFormat: 'SINGLE_ELIMINATION',
                    seedingMethod: 'MANUAL',
                });
            await drawRepository.assignPositions(
                draft.id,
                getPlayerAssignments(seeded.registrationIds),
            );
            draw = await drawRepository.publish(draft.id);
        }

        if (options.seedResults) {
            const seedResults = dependencies.seedMatchResults ?? seedMatchResults;
            matchResults = await seedResults(
                database,
                env,
                { drawRepository },
                { categoryCode: CATEGORY_CODE },
            );
        }
    }

    return {
        tournamentId: seeded.tournamentId,
        tournamentCategoryId: seeded.tournamentCategoryId,
        teamCount: TEAM_COUNT,
        playerCount: TEAM_COUNT * 2,
        registrationCount: seeded.registrationIds.length,
        drawId: draw?.id ?? null,
        drawVersion: draw?.version ?? null,
        matchResults,
        testUserEmailRange: 'nyx.seed.doubles.player.01@example.test through nyx.seed.doubles.player.30@example.test',
        testUserPasswordEnvironmentVariable: 'TEST_USERS_PASSWORD',
    };
}

if (require.main === module) {
    const withResults = process.argv.includes('--with-results');
    seedDoublesTournament(prisma, process.env, {}, {
        createDraw: withResults,
        seedResults: withResults,
    })
        .then((result) => {
            console.log("Men's doubles test registrations are ready:", result);
        })
        .catch((error) => {
            console.error('Failed to seed doubles tournament test data:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = {
    seedDoublesTournament,
    getTestDoublesTeams,
};
