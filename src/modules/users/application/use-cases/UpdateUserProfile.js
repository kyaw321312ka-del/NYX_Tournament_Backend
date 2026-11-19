const HttpError = require('../../../../shared/errors/HttpError');
const User = require('../../../auth/domain/entities/User');

class UpdateUserProfile {
    constructor({
        userRepository,
        passwordHasher,
        otpService,
        emailOtpSender,
        profileImageStorage,
        identityDocumentStorage,
    }) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.otpService = otpService;
        this.emailOtpSender = emailOtpSender;
        this.profileImageStorage = profileImageStorage;
        this.identityDocumentStorage = identityDocumentStorage;
    }

    async execute(userId, input, files = {}) {
        const existing = await this.userRepository.findProfileForUpdate(userId);
        if (!existing) {
            throw new HttpError(404, 'User not found.');
        }

        const changesEmail = input.email && input.email !== existing.email;
        if (input.email || input.password) {
            const passwordMatches = await this.passwordHasher.verify(
                input.currentPassword,
                existing.passwordHash,
            );
            if (!passwordMatches) {
                throw new HttpError(401, 'Current password is incorrect.');
            }
        }

        const update = {
            name: input.name,
            clubName: input.clubName,
            gender: input.gender,
            birthday: input.birthday ? new Date(`${input.birthday}T00:00:00.000Z`) : undefined,
            phno: input.phno,
            passwordHash: input.password
                ? await this.passwordHasher.hash(input.password)
                : undefined,
        };
        let emailChange;
        if (changesEmail) {
            const existingEmail = await this.userRepository.findUserByEmail(input.email);
            if (existingEmail) {
                throw new HttpError(409, 'An account with this email already exists.');
            }

            const otp = this.otpService.create();
            emailChange = {
                newEmail: input.email,
                otpHash: otp.hash,
                otpExpiresAt: otp.expiresAt,
                code: otp.code,
            };
        }

        const storedFiles = {};
        try {
            if (files.profileImage?.[0]) {
                storedFiles.profileImageUrl = await this.profileImageStorage.save(files.profileImage[0].buffer);
                update.profileImageUrl = storedFiles.profileImageUrl;
            }
            if (files.frontIdImg?.[0]) {
                storedFiles.frontIdImg = await this.identityDocumentStorage.save(files.frontIdImg[0].buffer);
                update.frontIdImg = storedFiles.frontIdImg;
            }
            if (files.backIdImg?.[0]) {
                storedFiles.backIdImg = await this.identityDocumentStorage.save(files.backIdImg[0].buffer);
                update.backIdImg = storedFiles.backIdImg;
            }
        } catch (error) {
            await this.removeStoredFiles(storedFiles);
            throw error;
        }

        let result;
        try {
            result = await this.userRepository.updateProfile(userId, update, emailChange, input.categoryIds);
        } catch (error) {
            await this.removeStoredFiles(storedFiles);
            if (error.code === 'P2002') {
                throw new HttpError(409, 'This email is already in use or pending verification.');
            }
            throw error;
        }

        await this.removePreviousFiles(result.previousFiles ?? {});
        if (emailChange) {
            await this.emailOtpSender.sendEmailChangeOtp(emailChange.newEmail, emailChange.code);
        }

        return {
            user: User.fromRecord(result.user ?? result).toPublicProfile(),
            emailVerificationRequired: Boolean(emailChange),
            pendingEmail: emailChange?.newEmail ?? null,
        };
    }

    async removeStoredFiles(files) {
        const removals = [];
        if (files.profileImageUrl) {
            removals.push(this.profileImageStorage.remove(files.profileImageUrl));
        }
        for (const filename of [files.frontIdImg, files.backIdImg]) {
            if (filename) {
                removals.push(this.identityDocumentStorage.remove(filename));
            }
        }
        await this.logRemovalFailures(removals, 'Failed to remove newly uploaded profile files:');
    }

    async removePreviousFiles(files) {
        const removals = [];
        if (files.profileImageUrl) {
            removals.push(this.profileImageStorage.remove(files.profileImageUrl));
        }
        for (const filename of [files.frontIdImg, files.backIdImg]) {
            if (filename) {
                removals.push(this.identityDocumentStorage.remove(filename));
            }
        }
        await this.logRemovalFailures(removals, 'Failed to remove replaced profile files:');
    }

    async logRemovalFailures(removals, message) {
        const results = await Promise.allSettled(removals);
        for (const result of results) {
            if (result.status === 'rejected') {
                console.error(message, result.reason);
            }
        }
    }
}

module.exports = UpdateUserProfile;
