const HttpError = require('../../../../shared/errors/HttpError');

class UpdateIdentityDocuments {
    constructor({ userRepository, documentStorage }) {
        this.userRepository = userRepository;
        this.documentStorage = documentStorage;
    }

    async execute(userId, files = {}) {
        const frontFile = files.frontIdImg?.[0];
        const backFile = files.backIdImg?.[0];
        if (!frontFile && !backFile) {
            throw new HttpError(400, 'Upload at least one file: frontIdImg or backIdImg.');
        }

        const storedFiles = {};
        try {
            if (frontFile) {
                storedFiles.frontIdImg = await this.documentStorage.save(frontFile.buffer);
            }
            if (backFile) {
                storedFiles.backIdImg = await this.documentStorage.save(backFile.buffer);
            }

            const result = await this.userRepository.updateIdentityDocuments(userId, storedFiles);

            for (const previousFilename of Object.values(result.previousDocuments)) {
                if (previousFilename) {
                    try {
                        await this.documentStorage.remove(previousFilename);
                    } catch (error) {
                        console.error('Failed to remove a replaced identity document:', error);
                    }
                }
            }

            return result.user;
        } catch (error) {
            for (const filename of Object.values(storedFiles)) {
                try {
                    await this.documentStorage.remove(filename);
                } catch (cleanupError) {
                    console.error('Failed to remove an unreferenced identity document:', cleanupError);
                }
            }
            throw error;
        }
    }
}

module.exports = UpdateIdentityDocuments;
