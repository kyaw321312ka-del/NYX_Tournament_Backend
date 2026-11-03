const HttpError = require('../../../../shared/errors/HttpError');

class PrismaUserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async updateProfileImage(userId, profileImageUrl) {
        return this.prisma.$transaction(async (transaction) => {
            const existing = await transaction.user.findUnique({
                where: { id: Number(userId) },
                select: { id: true, profileImageUrl: true },
            });

            if (!existing) {
                throw new HttpError(404, 'User not found.');
            }

            const user = await transaction.user.update({
                where: { id: existing.id },
                data: { profileImageUrl },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profileImageUrl: true,
                },
            });

            return {
                user,
                previousProfileImageUrl: existing.profileImageUrl,
            };
        });
    }
}

module.exports = PrismaUserRepository;
