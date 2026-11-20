const HttpError = require('../../../../shared/errors/HttpError');

class GetAdminIdentityDocument {
    constructor({ userRepository, documentStorage }) {
        this.userRepository = userRepository;
        this.documentStorage = documentStorage;
    }

    async execute(userId, side) {
        const filename = await this.userRepository.getIdentityDocumentFilename(userId, side);
        if (!filename) {
            throw new HttpError(404, 'Identity document not found.');
        }
        return this.documentStorage.read(filename);
    }
}

module.exports = GetAdminIdentityDocument;
