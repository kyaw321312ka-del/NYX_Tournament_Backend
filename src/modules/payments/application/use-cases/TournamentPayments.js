class TournamentPayments {
    constructor({ paymentRepository, proofStorage }) {
        this.paymentRepository = paymentRepository;
        this.proofStorage = proofStorage;
    }

    async submit(userId, registrationId, input, file) {
        const proofFilename = await this.proofStorage.save(file.buffer);
        try {
            return await this.paymentRepository.submit({
                userId,
                registrationId,
                paymentMethodId: input.paymentMethodId,
                proofImageUrl: proofFilename,
                transactionReference: input.transactionReference,
            });
        } catch (error) {
            try {
                await this.proofStorage.remove(proofFilename);
            } catch (cleanupError) {
                console.error('Failed to remove an unreferenced payment screenshot:', cleanupError);
            }
            throw error;
        }
    }

    list(query) {
        return this.paymentRepository.list(query);
    }

    listMine(userId, query) {
        return this.paymentRepository.listMine(userId, query);
    }

    listPending(query) {
        return this.paymentRepository.listPending(query);
    }

    review(adminId, paymentId, decision, rejectionReason) {
        return this.paymentRepository.review({
            adminId,
            paymentId,
            decision,
            rejectionReason,
        });
    }

    async readProof(paymentId) {
        const filename = await this.paymentRepository.findProofFilename(paymentId);
        return this.proofStorage.read(filename);
    }
}

module.exports = TournamentPayments;
