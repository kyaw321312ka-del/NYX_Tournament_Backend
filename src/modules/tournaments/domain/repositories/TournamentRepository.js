class TournamentRepository {
    async create() {
        throw new Error('TournamentRepository.create must be implemented');
    }

    async findById() {
        throw new Error('TournamentRepository.findById must be implemented');
    }

    async list() {
        throw new Error('TournamentRepository.list must be implemented');
    }

    async updateOwned() {
        throw new Error('TournamentRepository.updateOwned must be implemented');
    }

    async publishOwned() {
        throw new Error('TournamentRepository.publishOwned must be implemented');
    }

    async deleteOwned() {
        throw new Error('TournamentRepository.deleteOwned must be implemented');
    }
}

module.exports = TournamentRepository;
