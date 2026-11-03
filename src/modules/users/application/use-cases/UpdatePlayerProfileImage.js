const HttpError = require('../../../../shared/errors/HttpError');

class UpdatePlayerProfileImage {
    constructor({ userRepository, imageStorage }) {
        this.userRepository = userRepository;
        this.imageStorage = imageStorage;
    }

    async execute(userId, file) {
        if (!file?.buffer) {
            throw new HttpError(400, 'Provide a profile image in the "profileImage" form field.');
        }

        const profileImageUrl = await this.imageStorage.save(file.buffer);
        let result;

        try {
            result = await this.userRepository.updateProfileImage(userId, profileImageUrl);
        } catch (error) {
            try {
                await this.imageStorage.remove(profileImageUrl);
            } catch (cleanupError) {
                console.error('Failed to remove an unreferenced profile image:', cleanupError);
            }
            throw error;
        }

        if (result.previousProfileImageUrl) {
            try {
                await this.imageStorage.remove(result.previousProfileImageUrl);
            } catch (error) {
                console.error('Failed to remove the previous profile image:', error);
            }
        }

        return result.user;
    }
}

module.exports = UpdatePlayerProfileImage;
