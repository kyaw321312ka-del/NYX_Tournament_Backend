class PrismaTokenRevocationRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async revoke(tokenId, expiresAt) {
        const now = new Date();
        await this.prisma.$transaction(async (transaction) => {
            await transaction.revokedAccessToken.deleteMany({
                where: { expiresAt: { lte: now } },
            });
            await transaction.revokedAccessToken.upsert({
                where: { tokenId },
                create: { tokenId, expiresAt },
                update: { expiresAt },
            });
        });
    }

    async isRevoked(tokenId) {
        const revoked = await this.prisma.revokedAccessToken.findUnique({
            where: { tokenId },
            select: { tokenId: true },
        });
        return Boolean(revoked);
    }
}

module.exports = PrismaTokenRevocationRepository;
