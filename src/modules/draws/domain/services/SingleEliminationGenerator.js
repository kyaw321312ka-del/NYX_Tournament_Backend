class SingleEliminationGenerator {
    generate(bracketSize) {
        if (!Number.isInteger(bracketSize) || bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
            throw new RangeError('Bracket size must be a power of two greater than or equal to 2.');
        }

        const rounds = [];
        let matchCount = bracketSize / 2;

        for (let roundNumber = 1; matchCount >= 1; roundNumber += 1) {
            const matches = [];
            for (let matchNumber = 1; matchNumber <= matchCount; matchNumber += 1) {
                const slots = roundNumber === 1
                    ? [
                        { slotNumber: 1, bracketPosition: (matchNumber - 1) * 2 + 1 },
                        { slotNumber: 2, bracketPosition: (matchNumber - 1) * 2 + 2 },
                    ]
                    : [
                        { slotNumber: 1, sourceMatchNumber: (matchNumber - 1) * 2 + 1 },
                        { slotNumber: 2, sourceMatchNumber: (matchNumber - 1) * 2 + 2 },
                    ];
                matches.push({ roundNumber, matchNumber, slots });
            }
            rounds.push(matches);
            matchCount = Math.floor(matchCount / 2);
        }

        return rounds;
    }
}

module.exports = SingleEliminationGenerator;
