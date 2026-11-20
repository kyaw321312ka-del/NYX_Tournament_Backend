const HttpError = require('../../../../shared/errors/HttpError');

class PrismaUserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async findProfileForUpdate(userId) {
        return this.prisma.user.findUnique({
            where: { id: Number(userId) },
            select: { id: true, email: true, passwordHash: true },
        });
    }

    async findUserByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
    }

    async updateProfile(userId, data, emailChange, categoryIds) {
        return this.prisma.$transaction(async (transaction) => {
            const existing = await transaction.user.findUnique({
                where: { id: Number(userId) },
                select: {
                    id: true,
                    email: true,
                    profile: { select: { profileImageUrl: true } },
                    identityDocuments: {
                        select: { frontImageUrl: true, backImageUrl: true },
                    },
                },
            });
            if (!existing) {
                throw new HttpError(404, 'User not found.');
            }

            const updateData = {};
            for (const field of ['name', 'phno', 'passwordHash']) {
                if (data[field] !== undefined) updateData[field] = data[field];
            }

            const profileData = {};
            for (const field of ['clubName', 'address', 'gender', 'birthday', 'profileImageUrl']) {
                if (data[field] !== undefined) profileData[field] = data[field];
            }
            if (Object.keys(profileData).length) {
                updateData.profile = {
                    upsert: {
                        create: profileData,
                        update: profileData,
                    },
                };
            }

            const identityDocumentData = {};
            if (data.frontIdImg !== undefined) {
                identityDocumentData.frontImageUrl = data.frontIdImg;
            }
            if (data.backIdImg !== undefined) {
                identityDocumentData.backImageUrl = data.backIdImg;
            }
            if (Object.keys(identityDocumentData).length) {
                updateData.identityDocuments = {
                    upsert: {
                        create: {
                            ...identityDocumentData,
                            verificationStatus: 'pending',
                        },
                        update: {
                            ...identityDocumentData,
                            verificationStatus: 'pending',
                        },
                    },
                };
            }

            if (categoryIds) {
                const categories = await transaction.category.findMany({
                    where: { id: { in: categoryIds } },
                    select: { id: true },
                });
                if (categories.length !== categoryIds.length) {
                    throw new HttpError(400, 'One or more selected player categories are invalid.');
                }
                updateData.categories = {
                    deleteMany: {},
                    create: categoryIds.map((categoryId) => ({
                        category: { connect: { id: categoryId } },
                    })),
                };
            }

            if (emailChange) {
                await transaction.pendingEmailChange.deleteMany({
                    where: {
                        newEmail: emailChange.newEmail,
                        otpExpiresAt: { lte: new Date() },
                    },
                });
                const emailOwner = await transaction.user.findUnique({
                    where: { email: emailChange.newEmail },
                    select: { id: true },
                });
                if (emailOwner && emailOwner.id !== existing.id) {
                    throw new HttpError(409, 'An account with this email already exists.');
                }

                await transaction.pendingEmailChange.upsert({
                    where: { userId: existing.id },
                    create: {
                        userId: existing.id,
                        newEmail: emailChange.newEmail,
                        otpHash: emailChange.otpHash,
                        otpExpiresAt: emailChange.otpExpiresAt,
                    },
                    update: {
                        newEmail: emailChange.newEmail,
                        otpHash: emailChange.otpHash,
                        otpExpiresAt: emailChange.otpExpiresAt,
                        attempts: 0,
                    },
                });
            }

            const user = await transaction.user.update({
                where: { id: existing.id },
                data: updateData,
                include: {
                    role: true,
                    profile: true,
                    identityDocuments: {
                        select: {
                            frontImageUrl: true,
                            backImageUrl: true,
                            verificationStatus: true,
                        },
                    },
                    categories: {
                        select: {
                            category: {
                                select: {
                                    id: true,
                                    categoryCode: true,
                                    name: true,
                                    pairingType: true,
                                },
                            },
                        },
                    },
                },
            });
            return {
                user,
                previousFiles: {
                    profileImageUrl: data.profileImageUrl ? existing.profile?.profileImageUrl : null,
                    frontIdImg: data.frontIdImg ? existing.identityDocuments?.frontImageUrl : null,
                    backIdImg: data.backIdImg ? existing.identityDocuments?.backImageUrl : null,
                },
            };
        });
    }

    async findPendingEmailChange(userId) {
        return this.prisma.pendingEmailChange.findUnique({
            where: { userId: Number(userId) },
        });
    }

    async deletePendingEmailChange(userId) {
        return this.prisma.pendingEmailChange.deleteMany({
            where: { userId: Number(userId) },
        });
    }

    async incrementPendingEmailChangeAttempts(id) {
        return this.prisma.pendingEmailChange.updateMany({
            where: { id, attempts: { lt: 5 } },
            data: { attempts: { increment: 1 } },
        });
    }

    async completeEmailChange(userId, pendingId) {
        return this.prisma.$transaction(async (transaction) => {
            const pending = await transaction.pendingEmailChange.findUnique({
                where: { userId: Number(userId) },
            });
            if (!pending || pending.id !== pendingId || pending.attempts >= 5) {
                throw new HttpError(409, 'This email change can no longer be verified. Request it again.');
            }

            const deleted = await transaction.pendingEmailChange.deleteMany({
                where: { id: pendingId, userId: Number(userId), attempts: { lt: 5 } },
            });
            if (deleted.count !== 1) {
                throw new HttpError(409, 'This email change can no longer be verified. Request it again.');
            }

            return transaction.user.update({
                where: { id: Number(userId) },
                data: {
                    email: pending.newEmail,
                    emailVerifiedAt: new Date(),
                },
                include: { role: true, profile: true },
            });
        });
    }

    async updateProfileImage(userId, profileImageUrl) {
        return this.prisma.$transaction(async (transaction) => {
            const existing = await transaction.user.findUnique({
                where: { id: Number(userId) },
                select: {
                    id: true,
                    profile: { select: { profileImageUrl: true } },
                },
            });

            if (!existing) {
                throw new HttpError(404, 'User not found.');
            }

            const user = await transaction.user.update({
                where: { id: existing.id },
                data: {
                    profile: {
                        upsert: {
                            create: { profileImageUrl },
                            update: { profileImageUrl },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profile: { select: { profileImageUrl: true } },
                },
            });

            return {
                user: {
                    ...user,
                    profileImageUrl: user.profile?.profileImageUrl ?? null,
                },
                previousProfileImageUrl: existing.profile?.profileImageUrl ?? null,
            };
        });
    }

    async updateIdentityDocuments(userId, documents) {
        return this.prisma.$transaction(async (transaction) => {
            const existing = await transaction.user.findUnique({
                where: { id: Number(userId) },
                select: {
                    id: true,
                    identityDocuments: {
                        select: { frontImageUrl: true, backImageUrl: true },
                    },
                },
            });

            if (!existing) {
                throw new HttpError(404, 'User not found.');
            }

            const user = await transaction.user.update({
                where: { id: existing.id },
                data: {
                    identityDocuments: {
                        upsert: {
                            create: {
                                frontImageUrl: documents.frontIdImg,
                                backImageUrl: documents.backIdImg,
                                verificationStatus: 'pending',
                            },
                            update: {
                                ...(documents.frontIdImg !== undefined
                                    ? { frontImageUrl: documents.frontIdImg }
                                    : {}),
                                ...(documents.backIdImg !== undefined
                                    ? { backImageUrl: documents.backIdImg }
                                    : {}),
                                verificationStatus: 'pending',
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    identityDocuments: {
                        select: { frontImageUrl: true, backImageUrl: true },
                    },
                },
            });

            return {
                user: {
                    ...user,
                    frontIdImg: user.identityDocuments?.frontImageUrl ?? null,
                    backIdImg: user.identityDocuments?.backImageUrl ?? null,
                },
                previousDocuments: {
                    frontIdImg: documents.frontIdImg
                        ? existing.identityDocuments?.frontImageUrl ?? null
                        : null,
                    backIdImg: documents.backIdImg
                        ? existing.identityDocuments?.backImageUrl ?? null
                        : null,
                },
            };
        });
    }
}

module.exports = PrismaUserRepository;
