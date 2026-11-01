class AuthRepository {
    async findUserByEmail() {
        throw new Error('AuthRepository.findUserByEmail must be implemented');
    }

    async findUserById() {
        throw new Error('AuthRepository.findUserById must be implemented');
    }

    async findPendingRegistration() {
        throw new Error('AuthRepository.findPendingRegistration must be implemented');
    }

    async savePendingRegistration() {
        throw new Error('AuthRepository.savePendingRegistration must be implemented');
    }

    async incrementPendingAttempts() {
        throw new Error('AuthRepository.incrementPendingAttempts must be implemented');
    }

    async deletePendingRegistration() {
        throw new Error('AuthRepository.deletePendingRegistration must be implemented');
    }

    async completePendingRegistration() {
        throw new Error('AuthRepository.completePendingRegistration must be implemented');
    }
}

module.exports = AuthRepository;
