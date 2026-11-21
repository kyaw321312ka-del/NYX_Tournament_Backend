require('dotenv').config();

const SingleEliminationGenerator = require('../../src/modules/draws/domain/services/SingleEliminationGenerator');
const PrismaTournamentDrawRepository = require('../../src/modules/draws/infrastructure/repositories/PrismaTournamentDrawRepository');
const prisma = require('../../src/shared/database/prisma');

const TOURNAMENT_TITLE = 'NYX Seeded Test Open';
const CATEGORY_CODE = 'MS';

function validateEnvironment(env) {
    if (env.NODE_ENV === 'production') {
        throw new Error('Test match results cannot be seeded in production.');
    }
    if (env.SEED_TEST_DATA !== 'true') {
        throw new Error('Set SEED_TEST_DATA=true to explicitly enable test data seeding.');
    }
}

function createWinningGames(scoringRules, winnerNumber) {
    const {
        pointsToWin,
        winningMargin,
        maxPoints,
        gamesToWin,
    } = scoringRules;
    if (
        !Number.isInteger(pointsToWin)
        || !Number.isInteger(winningMargin)
        || !Number.isInteger(maxPoints)
        || !Number.isInteger(gamesToWin)
        || pointsToWin < 1
        || winningMargin < 1
        || maxPoints < pointsToWin
        || winningMargin > maxPoints
        || gamesToWin < 1
    ) {
        throw new Error('The draw has invalid scoring rules for seeding match results.');
    }

    const winnerScore = Math.min(maxPoints, Math.max(pointsToWin, winningMargin));
    const loserScore = Math.max(0, winnerScore - winningMargin);
    if (
        winnerScore < pointsToWin
        || (winnerScore - loserScore < winningMargin && winnerScore !== maxPoints)
    ) {
        throw new Error('The draw scoring rules cannot produce a valid seeded game score.');
    }

    return Array.from({ length: gamesToWin }, (_, index) => ({
        gameNumber: index + 1,
        participant1Score: winnerNumber === 1 ? winnerScore : loserScore,
        participant2Score: winnerNumber === 2 ? winnerScore : loserScore,
    }));
}

async function seedMatchResults(database, env, dependencies = {}, options = {}) {
    validateEnvironment(env);
    const categoryCode = options.categoryCode ?? CATEGORY_CODE;

    const tournament = await database.tournament.findFirst({
        where: { title: TOURNAMENT_TITLE },
        select: { id: true },
    });
    if (!tournament) {
        throw new Error('The seeded test tournament was not found.');
    }
    const category = await database.category.findUnique({
        where: { categoryCode },
        select: { id: true },
    });
    if (!category) {
        throw new Error('The seeded test category was not found.');
    }
    const tournamentCategory = await database.tournamentCategory.findFirst({
        where: {
            tournamentId: tournament.id,
            categoryId: category.id,
            ageGroupId: null,
        },
        select: { id: true },
    });
    if (!tournamentCategory) {
        throw new Error('The seeded test tournament category was not found.');
    }

    const latestDraw = await database.tournamentDraw.findFirst({
        where: { tournamentCategoryId: tournamentCategory.id },
        orderBy: { version: 'desc' },
        select: { id: true, version: true, status: true, finalizedAt: true },
    });
    if (!latestDraw || latestDraw.status !== 'PUBLISHED') {
        throw new Error('The latest seeded draw must be published before match results can be seeded.');
    }
    if (latestDraw.finalizedAt) {
        throw new Error('The latest seeded draw is finalized and cannot receive match results.');
    }

    const drawRepository = dependencies.drawRepository
        ?? new PrismaTournamentDrawRepository(database, new SingleEliminationGenerator());
    const initialDraw = await drawRepository.getDraw(
        tournamentCategory.id,
        latestDraw.id,
    );
    const scoringRules = initialDraw.configurationSnapshot?.scoringRules;
    if (!scoringRules) {
        throw new Error('The latest seeded draw has no scoring-rule snapshot.');
    }

    let draw = initialDraw;
    let seededMatchCount = 0;
    const matchLimit = draw.matches.length;
    while (true) {
        const nextMatch = draw.matches.find((match) => (
            match.status === 'PENDING'
            && match.slots.length === 2
            && match.slots.every(({ participantId }) => participantId !== null)
        ));
        if (!nextMatch) {
            const pendingMatchCount = draw.matches.filter(
                ({ status }) => status === 'PENDING',
            ).length;
            if (pendingMatchCount > 0) {
                throw new Error(
                    `${pendingMatchCount} pending match(es) still need players; no further results were seeded.`,
                );
            }
            break;
        }

        const winnerNumber = ((nextMatch.roundNumber + nextMatch.matchNumber) % 2) + 1;
        await drawRepository.recordMatchResult(
            latestDraw.id,
            nextMatch.id,
            createWinningGames(scoringRules, winnerNumber),
        );
        seededMatchCount += 1;
        if (seededMatchCount > matchLimit) {
            throw new Error('Match result seeding exceeded the draw match count.');
        }
        draw = await drawRepository.getDraw(tournamentCategory.id, latestDraw.id);
    }

    return {
        tournamentCategoryId: tournamentCategory.id,
        drawId: latestDraw.id,
        drawVersion: latestDraw.version,
        seededMatchCount,
        completedMatchCount: draw.matches.filter(
            ({ status }) => status === 'COMPLETED',
        ).length,
        byeMatchCount: draw.matches.filter(({ status }) => status === 'BYE').length,
        pendingMatchCount: draw.matches.filter(({ status }) => status === 'PENDING').length,
        finalized: Boolean(draw.finalizedAt),
    };
}

if (require.main === module) {
    seedMatchResults(prisma, process.env)
        .then((result) => {
            console.log('Seeded test match results:', result);
        })
        .catch((error) => {
            console.error('Failed to seed test match results:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}

module.exports = {
    seedMatchResults,
    createWinningGames,
};
