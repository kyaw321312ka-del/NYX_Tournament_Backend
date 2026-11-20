class SingleEliminationGenerator {
    generate(bracketSize) {
        if (!Number.isInteger(bracketSize) || bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
            throw new RangeError('Bracket size must be a power of two greater than or equal to 2.');
        }

        const positions = Array.from({ length: bracketSize }, (_, index) => ({
            bracketPosition: index + 1,
            assignable: true,
        }));
        const matches = [];
        let matchCount = bracketSize / 2;
        let previousRound = [];

        for (let roundNumber = 1; matchCount >= 1; roundNumber += 1) {
            const currentRound = [];
            for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
                const key = `SE-R${roundNumber}-M${matchNumber}`;
                const slots = roundNumber === 1
                    ? [
                        { slotNumber: 1, bracketPosition: (matchNumber - 1) * 2 + 1 },
                        { slotNumber: 2, bracketPosition: (matchNumber - 1) * 2 + 2 },
                    ]
                    : [
                        { slotNumber: 1, sourceMatchKey: previousRound[(matchNumber - 1) * 2] },
                        { slotNumber: 2, sourceMatchKey: previousRound[(matchNumber - 1) * 2 + 1] },
                    ];
                currentRound.push(key);
                matches.push({
                    key,
                    roundNumber,
                    matchNumber,
                    slots,
                });
            }
            previousRound = currentRound;
            matchCount = Math.floor(matchCount / 2);
        }

        return { positions, matches };
    }
}

module.exports = SingleEliminationGenerator;
