const PairingType = require('../../../tournaments/domain/enums/PairingType');
const RegistrationStatus = require('../../../tournaments/domain/enums/RegistrationStatus');
const RegistrationError = require('../errors/RegistrationError');

const CATEGORY_RULES = Object.freeze({
    MS: { pairingType: PairingType.SINGLES, genders: ['male'] },
    WS: { pairingType: PairingType.SINGLES, genders: ['female'] },
    MD: { pairingType: PairingType.DOUBLES, genders: ['male', 'male'] },
    WD: { pairingType: PairingType.DOUBLES, genders: ['female', 'female'] },
    XD: { pairingType: PairingType.MIXED_DOUBLES, genders: ['female', 'male'] },
});

class RegistrationEligibilityService {
    getCategoryRule(category) {
        const rule = CATEGORY_RULES[category.categoryCode];
        if (!rule || rule.pairingType !== category.pairingType) {
            throw new RegistrationError(409, 'Tournament category has no valid eligibility configuration.');
        }
        return rule;
    }

    validateCategory(category) {
        if (category.tournament.publicationStatus !== 'published') {
            throw new RegistrationError(409, 'Tournament is not published and cannot accept registrations.');
        }
        if (category.entryStatus !== RegistrationStatus.OPEN) {
            throw new RegistrationError(409, 'Tournament category is not open for registrations.');
        }
        return this.getCategoryRule(category);
    }

    validatePlayers(category, players) {
        const rule = this.validateCategory(category);
        if (players.length !== rule.genders.length) {
            throw new RegistrationError(
                400,
                `${category.categoryCode} registrations require exactly ${rule.genders.length} player(s).`,
            );
        }

        const genders = [];
        for (const player of players) {
            if (!player?.emailVerifiedAt) {
                throw new RegistrationError(403, 'All players must have verified email addresses.');
            }
            const gender = typeof player.gender === 'string'
                ? player.gender.trim().toLowerCase()
                : null;
            if (!['male', 'female'].includes(gender)) {
                throw new RegistrationError(400, 'Player gender is not eligible for this category.');
            }
            genders.push(gender);
        }

        const expected = [...rule.genders].sort();
        if (genders.sort().some((gender, index) => gender !== expected[index])) {
            throw new RegistrationError(
                400,
                `Players do not meet the gender eligibility requirements for ${category.categoryCode}.`,
            );
        }
    }
}

module.exports = RegistrationEligibilityService;
