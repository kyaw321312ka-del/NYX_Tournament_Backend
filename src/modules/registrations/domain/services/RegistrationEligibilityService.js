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
    getCategoryCode(category) {
        return category.eventCategory?.categoryCode ?? category.categoryCode;
    }

    getCategoryRule(category) {
        const categoryCode = this.getCategoryCode(category);
        const rule = CATEGORY_RULES[categoryCode];
        const pairingType = category.eventCategory?.pairingType ?? category.pairingType;
        if (!rule || rule.pairingType !== pairingType) {
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

    validatePlayerAges(category, players, asOfDate = new Date()) {
        const ageGroup = category.ageGroup;
        if (!ageGroup) return;

        if (Number.isNaN(asOfDate.getTime())) {
            throw new RegistrationError(409, 'Age eligibility reference date is invalid.');
        }
        for (const player of players) {
            const birthdayValue = player?.profile?.birthday ?? player?.birthday;
            if (!birthdayValue) {
                throw new RegistrationError(400, 'A birthday is required for age-restricted categories.');
            }

            const birthday = new Date(birthdayValue);
            if (Number.isNaN(birthday.getTime())) {
                throw new RegistrationError(400, 'A valid birthday is required for age-restricted categories.');
            }

            let age = asOfDate.getUTCFullYear() - birthday.getUTCFullYear();
            const beforeBirthdayThisYear = asOfDate.getUTCMonth() < birthday.getUTCMonth()
                || (
                    asOfDate.getUTCMonth() === birthday.getUTCMonth()
                    && asOfDate.getUTCDate() < birthday.getUTCDate()
                );
            if (beforeBirthdayThisYear) age -= 1;

            if (age > ageGroup.age) {
                throw new RegistrationError(
                    400,
                    `Player does not meet the age requirements for age group ${ageGroup.name}.`,
                );
            }
        }
    }

    validatePlayers(category, players, asOfDate = new Date()) {
        const rule = this.validateCategory(category);
        if (players.length !== rule.genders.length) {
            throw new RegistrationError(
                400,
                `${this.getCategoryCode(category)} registrations require exactly ${rule.genders.length} player(s).`,
            );
        }
        this.validatePlayerAges(category, players, asOfDate);

        const genders = [];
        for (const player of players) {
            if (!player?.emailVerifiedAt) {
                throw new RegistrationError(403, 'All players must have verified email addresses.');
            }
            const playerGender = player.profile?.gender ?? player.gender;
            const gender = typeof playerGender === 'string'
                ? playerGender.trim().toLowerCase()
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
                `Players do not meet the gender eligibility requirements for ${this.getCategoryCode(category)}.`,
            );
        }
    }
}

module.exports = RegistrationEligibilityService;
