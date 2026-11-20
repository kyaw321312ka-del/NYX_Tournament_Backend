function validateGame(game, scoring) {
    const {
        participant1Score,
        participant2Score,
    } = game;
    const { pointsToWin, winningMargin, maxPoints } = scoring;
    if (
        !Number.isInteger(participant1Score)
        || !Number.isInteger(participant2Score)
        || participant1Score < 0
        || participant2Score < 0
        || participant1Score > maxPoints
        || participant2Score > maxPoints
    ) {
        throw new RangeError('Game scores must be non-negative integers within the configured maximum.');
    }

    if (participant1Score === participant2Score) {
        throw new RangeError('A completed game cannot end in a tie.');
    }

    const winnerScore = Math.max(participant1Score, participant2Score);
    const loserScore = Math.min(participant1Score, participant2Score);
    const margin = winnerScore - loserScore;
    if (
        winnerScore < pointsToWin
        || (margin < winningMargin && winnerScore !== maxPoints)
    ) {
        throw new RangeError('The game score does not satisfy the configured points-to-win and winning-margin rules.');
    }

    return participant1Score > participant2Score ? 1 : 2;
}

function determineMatchWinner(games, scoring) {
    if (
        !Array.isArray(games)
        || games.length < 1
        || !Number.isInteger(scoring?.gamesToWin)
        || scoring.gamesToWin < 1
        || games.length > (2 * scoring.gamesToWin) - 1
    ) {
        throw new RangeError('The result must contain a valid number of games.');
    }

    const gameWins = [0, 0];
    for (const [index, game] of games.entries()) {
        if (game.gameNumber !== index + 1) {
            throw new RangeError('Game numbers must be sequential starting at 1.');
        }

        const winnerNumber = validateGame(game, scoring);
        gameWins[winnerNumber - 1] += 1;
        const matchWinnerNumber = gameWins.findIndex((wins) => wins >= scoring.gamesToWin) + 1;
        if (matchWinnerNumber > 0) {
            if (index !== games.length - 1) {
                throw new RangeError('No games may be submitted after a match has been decided.');
            }
            return matchWinnerNumber;
        }
    }

    throw new RangeError('The result does not contain enough game wins to decide the match.');
}

module.exports = { determineMatchWinner };
