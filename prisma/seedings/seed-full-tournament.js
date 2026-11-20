require('dotenv').config();

const bcrypt = require('bcryptjs');
const LocalPaymentProofStorage = require('../../src/modules/payments/infrastructure/services/LocalPaymentProofStorage');
const SingleEliminationGenerator = require('../../src/modules/draws/domain/services/SingleEliminationGenerator');
const PrismaTournamentDrawRepository = require('../../src/modules/draws/infrastructure/repositories/PrismaTournamentDrawRepository');
const prisma = require('../../src/shared/database/prisma');

const PLAYER_COUNT = 35;
const TOURNAMENT_TITLE = 'NYX Seeded Test Open';
const CATEGORY_CODE = 'MS';
const PAYMENT_METHOD_NAME = 'NYX Seed Test Payment';
const PAYMENT_PROOF = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
    'base64',
);

function getTestPlayers() {
    return Array.from({ length: PLAYER_COUNT }, (_, index) => {
        const number = String(index + 1).padStart(2, '0');
        return {
            name: `NYX Seed Player ${number}`,
            email: `nyx.seed.player.${number}@example.test`,
            phno: `+959000000${String(index + 1).padStart(3, '0')}`,
            gender: 'male',
            birthday: new Date(Date.UTC(1990 + (index % 10), 0, 1)),
            clubName: `Seed Test Club ${String((index % 5) + 1).padStart(2, '0')}`,
        };
    });
}

function getPlayerAssignments(registrationIds) {
    const bracketSize = 2 ** Math.ceil(Math.log2(registrationIds.length));
    const firstRoundMatchCount = bracketSize / 2;
    const byeCount = bracketSize - registrationIds.length;
    const assignments = [];
    let registrationIndex = 0;

    for (let matchIndex = 0; matchIndex < firstRoundMatchCount; matchIndex += 1) {
        const firstPosition = matchIndex * 2 + 1;
        assignments.push({
            registrationId: registrationIds[registrationIndex],
            bracketPosition: firstPosition,
        });
        registrationIndex += 1;

        if (matchIndex >= byeCount) {
            assignments.push({
                registrationId: registrationIds[registrationIndex],
                bracketPosition: firstPosition + 1,
            });
            registrationIndex += 1;
        }
    }

    return assignments;
}

function validateEnvironment(env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Test tournament data cannot be seeded in production.');
    }
    if (env.SEED_TEST_DATA !== 'true') {
        throw new Error('Set SEED_TEST_DATA=true to explicitly enable test data seeding.');
    }

    const passwordBytes = env.TEST_USERS_PASSWORD
        ? Buffer.byteLength(env.TEST_USERS_PASSWORD, 'utf8')
        : 0;
    if (passwordBytes < 12 || passwordBytes > 72) {
        throw new Error('Set TEST_USERS_PASSWORD to a password between 12 and 72 bytes.');
    }

    const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail) {
        throw new Error('Set ADMIN_EMAIL to an existing administrator account.');
    }

    return { adminEmail, password: env.TEST_USERS_PASSWORD };
}

async function getPaymentProof(storage, database) {
    const existingPayment = await database.tournamentPayment.findFirst({
        where: { paymentMethodName: PAYMENT_METHOD_NAME },
        select: { proofImageUrl: true },
    });
    if (existingPayment) {
        try {
            await storage.read(existingPayment.proofImageUrl);
            return { filename: existingPayment.proofImageUrl, created: false };
        } catch (error) {
            if (error.statusCode !== 404) throw error;
        }
    }

    return { filename: await storage.save(PAYMENT_PROOF), created: true };
}

async function seedFullTournament(database, env, dependencies = {}) {
    const { adminEmail, password } = validateEnvironment(env);
    const admin = await database.user.findUnique({
        where: { email: adminEmail },
        select: { id: true, role: { select: { name: true } } },
    });
    if (!admin || admin.role?.name !== 'admin') {
        throw new Error('ADMIN_EMAIL must belong to an existing administrator account.');
    }

    const proofStorage = dependencies.proofStorage ?? new LocalPaymentProofStorage();
    const drawRepository = dependencies.drawRepository ?? new PrismaTournamentDrawRepository(
        database,
        new SingleEliminationGenerator(),
    );
    const proof = await getPaymentProof(proofStorage, database);
    const passwordHash = await bcrypt.hash(password, 12);
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
                    name: "Men's Singles",
                    pairingType: 'singles',
                },
                update: {
                    name: "Men's Singles",
                    pairingType: 'singles',
                },
            });
            const tournament = await transaction.tournament.findFirst({
                where: { createdBy: admin.id, title: TOURNAMENT_TITLE },
                select: { id: true },
            });
            const tournamentRecord = tournament
                ? await transaction.tournament.update({
                    where: { id: tournament.id },
                    data: {
                        description: 'Development seed for testing tournament registration, payments, and draws.',
                        startDate: new Date('2027-02-20T00:00:00.000Z'),
                        endDate: new Date('2027-02-21T00:00:00.000Z'),
                        publicationStatus: 'published',
                    },
                    select: { id: true },
                })
                : await transaction.tournament.create({
                    data: {
                        createdBy: admin.id,
                        title: TOURNAMENT_TITLE,
                        description: 'Development seed for testing tournament registration, payments, and draws.',
                        startDate: new Date('2027-02-20T00:00:00.000Z'),
                        endDate: new Date('2027-02-21T00:00:00.000Z'),
                        publicationStatus: 'published',
                        venues: {
                            create: [{
                                venueName: 'NYX Test Sports Hall',
                                address: 'Development test venue',
                            }],
                        },
                        rules: {
                            create: [{
                                title: 'Test tournament rules',
                                description: 'Seed data for development and API testing only.',
                                sortOrder: 1,
                            }],
                        },
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
            const existingTournamentCategory = await transaction.tournamentCategory.findFirst({
                where: {
                    tournamentId: tournamentRecord.id,
                    categoryId: category.id,
                    ageGroupId: null,
                },
                select: { id: true },
            });
            const tournamentCategory = existingTournamentCategory
                ? await transaction.tournamentCategory.update({
                    where: { id: existingTournamentCategory.id },
                    data: tournamentCategoryData,
                    select: { id: true },
                })
                : await transaction.tournamentCategory.create({
                    data: {
                        tournamentId: tournamentRecord.id,
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

            const registrationIds = [];
            for (const player of getTestPlayers()) {
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

                let registration = await transaction.tournamentRegistration.findFirst({
                    where: {
                        tournamentCategoryId: tournamentCategory.id,
                        registeredBy: user.id,
                        members: { some: { userId: user.id } },
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
                            registeredBy: user.id,
                            statusId: confirmedStatus.id,
                            members: { create: [{ userId: user.id }] },
                        },
                        select: { id: true },
                    });
                await transaction.tournamentRegistrationMember.upsert({
                    where: {
                        registrationId_userId: {
                            registrationId: registration.id,
                            userId: user.id,
                        },
                    },
                    create: {
                        registrationId: registration.id,
                        tournamentCategoryId: tournamentCategory.id,
                        userId: user.id,
                    },
                    update: {},
                });

                const paymentData = {
                    paymentMethodName: paymentMethod.paymentMethodName,
                    accountName: paymentMethod.accountName,
                    accountNumber: paymentMethod.accountNumber,
                    amount: 10000,
                    currency: 'MMK',
                    proofImageUrl: proof.filename,
                    transactionReference: `NYX-SEED-${registration.id}`,
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
                tournamentId: tournamentRecord.id,
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

    let draw;
    try {
        draw = await drawRepository.getLatestDraw(seeded.tournamentCategoryId);
    } catch (error) {
        if (error.statusCode !== 404) throw error;
    }

    const registrationIds = new Set(seeded.registrationIds);
    const currentPublishedDrawIsComplete = draw?.status === 'PUBLISHED'
        && draw.configurationSnapshot?.bracketSize === 2 ** Math.ceil(Math.log2(PLAYER_COUNT))
        && draw.participants?.length === PLAYER_COUNT
        && draw.participants.every(({ registrationId }) => registrationIds.has(registrationId));
    if (!currentPublishedDrawIsComplete) {
        const draft = await drawRepository.createDraft(seeded.tournamentCategoryId, {
            drawFormat: 'SINGLE_ELIMINATION',
            seedingMethod: 'MANUAL',
        });
        await drawRepository.assignPositions(draft.id, getPlayerAssignments(seeded.registrationIds));
        draw = await drawRepository.publish(draft.id);
    }

    return {
        tournamentId: seeded.tournamentId,
        tournamentCategoryId: seeded.tournamentCategoryId,
        playerCount: PLAYER_COUNT,
        registrationCount: seeded.registrationIds.length,
        drawId: draw.id,
        drawVersion: draw.version,
        bracketSize: 2 ** Math.ceil(Math.log2(PLAYER_COUNT)),
        paymentProof: '/api/admin/payments/:paymentId/proof (shared test image)',
        testUserEmailPattern: 'nyx.seed.player.NN@example.test',
        testUserPasswordEnvironmentVariable: 'TEST_USERS_PASSWORD',
    };
}

if (require.main === module) {
    seedFullTournament(prisma, process.env)
        .then((result) => {
            console.log('Full tournament test data is ready:', result);
        })
        .catch((error) => {
            console.error('Failed to seed full tournament test data:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = {
    seedFullTournament,
    getPlayerAssignments,
};
