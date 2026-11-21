class SingleEliminationGenerator {
    generate(bracketSize, options = {}) {
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
        let semifinalMatches = null;

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
            if (matchCount === 1) {
                semifinalMatches = [...previousRound];
            }
            previousRound = currentRound;
            matchCount = Math.floor(matchCount / 2);
        }

        if (options.thirdPlaceMatch && bracketSize >= 4) {
            const thirdPlaceRound = Math.log2(bracketSize);
            matches.push({
                key: 'SE-THIRD-PLACE',
                roundNumber: thirdPlaceRound + 1,
                matchNumber: 1,
                slots: [
                    { slotNumber: 1, sourceMatchKey: semifinalMatches[0] },
                    { slotNumber: 2, sourceMatchKey: semifinalMatches[1] },
                ],
            });
        }

        return { positions, matches };
    }
}

module.exports = SingleEliminationGenerator;
