const RegistrationRepository = require('../../domain/repositories/RegistrationRepository');
const Registration = require('../../domain/entities/Registration');
const PartnerInvitation = require('../../domain/entities/PartnerInvitation');
const RegistrationError = require('../../domain/errors/RegistrationError');
const PairingType = require('../../../tournaments/domain/enums/PairingType');
const RegistrationStatus = require('../../../tournaments/domain/enums/RegistrationStatus');

const INVITATION_EXPIRY_HOURS = 48;
const DUPLICATE_PARTICIPATION_MESSAGE =
    'One or more players are already registered for this tournament category.';
const partnerInvitationInclude = {
    category: {
        include: {
            tournament: {
                select: { id: true, title: true },
            },
        },
    },
    inviter: {
        select: { id: true, name: true, email: true, emailVerifiedAt: true },
    },
    invitedUser: {
        select: { id: true, name: true, email: true, emailVerifiedAt: true },
    },
};

async function withParticipationConflictHandling(operation) {
    try {
        return await operation();
    } catch (error) {
        if (error?.code === 'P2002') {
            throw new RegistrationError(409, DUPLICATE_PARTICIPATION_MESSAGE);
        }
        if (error?.code === 'P2034') {
            throw new RegistrationError(409, 'Registration changed concurrently. Please retry.');
        }
        throw error;
    }
}

class PrismaRegistrationRepository extends RegistrationRepository {
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }

    async create({ userId, tournamentCategoryId, members = [] }) {
        const categoryId = Number(tournamentCategoryId);
        const ownerId = Number(userId);

        const uniqueMemberIds = [...new Set([
            ownerId,
            ...members.map((member) => Number(member)),
        ].filter((memberId) => Number.isInteger(memberId) && memberId > 0))];
        const registrationPromise = this.prisma.$transaction(async (transaction) => {
            const category = await transaction.tournamentCategory.findUnique({
                where: { id: categoryId },
                include: {
                    tournament: {
                        select: { publicationStatus: true },
                    },
                },
            });

            if (!category) {
                throw new RegistrationError(404, 'Tournament category not found.');
            }

            if (category.tournament.publicationStatus !== 'published') {
                throw new RegistrationError(409, 'Tournament is not published and cannot accept registrations.');
            }

            if (category.entryStatus !== RegistrationStatus.OPEN) {
                throw new RegistrationError(409, 'Tournament category is not open for registrations.');
            }

            if (category.pairingType !== PairingType.SINGLES) {
                throw new RegistrationError(
                    400,
                    'Doubles registrations require a partner invitation accepted by both players.',
                );
            }

            if (uniqueMemberIds.length !== 1) {
                throw new RegistrationError(400, 'Singles registrations require exactly one player.');
            }

            const duplicate = await transaction.tournamentRegistration.findFirst({
                where: {
                    tournamentCategoryId: categoryId,
                    members: {
                        some: {
                            userId: { in: uniqueMemberIds },
                        },
                    },
                },
                select: { id: true },
            });

            if (duplicate) {
                throw new RegistrationError(
                    409,
                    'One or more players are already registered for this tournament category.',
                );
            }

            const status = await transaction.tournamentRegistrationStatus.upsert({
                where: { name: 'pending' },
                update: {},
                create: { name: 'pending' },
            });

            return transaction.tournamentRegistration.create({
                data: {
                    tournamentCategoryId: categoryId,
                    registeredBy: ownerId,
                    statusId: status.id,
                    members: {
                        create: uniqueMemberIds.map((memberId) => ({
                            userId: memberId,
                            tournamentCategoryId: categoryId,
                        })),
                    },
                },
                include: {
                    category: true,
                    creator: {
                        select: { id: true, name: true },
                    },
                    status: true,
                    members: {
                        include: {
                            user: {
                                select: { id: true, name: true, email: true },
                            },
                        },
                    },
                },
            });
        }, { isolationLevel: 'Serializable' });
        const registration = await withParticipationConflictHandling(() => registrationPromise);

        return Registration.fromRecord(registration);
    }

    async createPartnerInvitation({ userId, tournamentCategoryId, partnerEmail }) {
        const inviterId = Number(userId);
        const categoryId = Number(tournamentCategoryId);
        const email = partnerEmail.trim().toLowerCase();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

        const invitation = await this.prisma.$transaction(async (transaction) => {
            const [category, inviter, invitedUser] = await Promise.all([
                transaction.tournamentCategory.findUnique({
                    where: { id: categoryId },
                    include: { tournament: { select: { publicationStatus: true } } },
                }),
                transaction.user.findUnique({
                    where: { id: inviterId },
                    select: { id: true, emailVerifiedAt: true },
                }),
                transaction.user.findUnique({
                    where: { email },
                    select: { id: true, email: true, emailVerifiedAt: true },
                }),
            ]);

            if (!category) {
                throw new RegistrationError(404, 'Tournament category not found.');
            }
            this.assertCategoryAcceptsRegistration(category);

            if (!inviter?.emailVerifiedAt) {
                throw new RegistrationError(403, 'Verify your email before inviting a partner.');
            }
            if (!invitedUser) {
                throw new RegistrationError(404, 'The invited player must have an account.');
            }
            if (!invitedUser.emailVerifiedAt) {
                throw new RegistrationError(409, 'The invited player must verify their email before being invited.');
            }
            if (inviterId === invitedUser.id) {
                throw new RegistrationError(400, 'You cannot invite yourself as a partner.');
            }

            const playerIds = [inviterId, invitedUser.id];
            const existingRegistration = await transaction.tournamentRegistration.findFirst({
                where: {
                    tournamentCategoryId: categoryId,
                    members: { some: { userId: { in: playerIds } } },
                },
                select: { id: true },
            });
            if (existingRegistration) {
                throw new RegistrationError(
                    409,
                    'One or more players are already registered for this tournament category.',
                );
            }

            const existingInvitation = await transaction.tournamentPartnerInvitation.findFirst({
                where: {
                    tournamentCategoryId: categoryId,
                    status: 'pending',
                    expiresAt: { gt: now },
                    OR: [
                        { invitedBy: { in: playerIds } },
                        { invitedUserId: { in: playerIds } },
                    ],
                },
                select: { id: true },
            });
            if (existingInvitation) {
                throw new RegistrationError(
                    409,
                    'One or more players already have a pending partner invitation for this category.',
                );
            }

            return transaction.tournamentPartnerInvitation.create({
                data: {
                    tournamentCategoryId: categoryId,
                    invitedBy: inviterId,
                    invitedUserId: invitedUser.id,
                    expiresAt,
                },
                include: partnerInvitationInclude,
            });
        }, { isolationLevel: 'Serializable' });

        return PartnerInvitation.fromRecord(invitation);
    }

    async listPartnerInvitations(userId, direction, { page = 1, pageSize = 20 } = {}) {
        const user = Number(userId);
        const pageNumber = Number(page);
        const limit = Number(pageSize);
        const skip = (pageNumber - 1) * limit;
        const now = new Date();
        const ownershipFilter = direction === 'received'
            ? { invitedUserId: user }
            : { invitedBy: user };

        await this.prisma.tournamentPartnerInvitation.updateMany({
            where: {
                ...ownershipFilter,
                status: 'pending',
                expiresAt: { lte: now },
            },
            data: {
                status: 'expired',
                respondedAt: now,
            },
        });

        const where = {
            ...ownershipFilter,
            status: 'pending',
        };
        const [items, total] = await Promise.all([
            this.prisma.tournamentPartnerInvitation.findMany({
                where,
                include: partnerInvitationInclude,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.tournamentPartnerInvitation.count({ where }),
        ]);

        return {
            items: items.map((item) => PartnerInvitation.fromRecord(item)),
            pagination: {
                page: pageNumber,
                pageSize: limit,
                total,
                pageCount: total === 0 ? 0 : Math.ceil(total / limit),
            },
        };
    }

    async acceptPartnerInvitation(userId, invitationId) {
        const playerId = Number(userId);
        const id = Number(invitationId);
        const now = new Date();
        const resultPromise = this.prisma.$transaction(async (transaction) => {
            const invitation = await transaction.tournamentPartnerInvitation.findUnique({
                where: { id },
                include: {
                    ...partnerInvitationInclude,
                    category: {
                        include: {
                            ...partnerInvitationInclude.category.include,
                            tournament: { select: { publicationStatus: true } },
                        },
                    },
                },
            });

            if (!invitation) {
                throw new RegistrationError(404, 'Partner invitation not found.');
            }
            if (invitation.invitedUserId !== playerId) {
                throw new RegistrationError(403, 'Only the invited player can accept this invitation.');
            }
            if (invitation.status !== 'pending') {
                throw new RegistrationError(409, 'Only pending partner invitations can be accepted.');
            }
            if (invitation.expiresAt <= now) {
                await transaction.tournamentPartnerInvitation.update({
                    where: { id },
                    data: { status: 'expired', respondedAt: now },
                });
                return { expired: true };
            }

            this.assertCategoryAcceptsRegistration(invitation.category);
            if (!invitation.inviter.emailVerifiedAt || !invitation.invitedUser.emailVerifiedAt) {
                throw new RegistrationError(409, 'Both players must have verified email addresses.');
            }

            const playerIds = [invitation.invitedBy, invitation.invitedUserId];
            const existingRegistration = await transaction.tournamentRegistration.findFirst({
                where: {
                    tournamentCategoryId: invitation.tournamentCategoryId,
                    members: { some: { userId: { in: playerIds } } },
                },
                select: { id: true },
            });
            if (existingRegistration) {
                throw new RegistrationError(
                    409,
                    'One or more players are already registered for this tournament category.',
                );
            }

            const otherPendingInvitation = await transaction.tournamentPartnerInvitation.findFirst({
                where: {
                    id: { not: id },
                    tournamentCategoryId: invitation.tournamentCategoryId,
                    status: 'pending',
                    expiresAt: { gt: now },
                    OR: [
                        { invitedBy: { in: playerIds } },
                        { invitedUserId: { in: playerIds } },
                    ],
                },
                select: { id: true },
            });
            if (otherPendingInvitation) {
                throw new RegistrationError(
                    409,
                    'One or more players already have another pending partner invitation for this category.',
                );
            }

            const status = await transaction.tournamentRegistrationStatus.upsert({
                where: { name: 'pending' },
                update: {},
                create: { name: 'pending' },
            });
            const registration = await transaction.tournamentRegistration.create({
                data: {
                    tournamentCategoryId: invitation.tournamentCategoryId,
                    registeredBy: invitation.invitedBy,
                    statusId: status.id,
                    members: {
                        create: playerIds.map((memberId) => ({
                            userId: memberId,
                            tournamentCategoryId: invitation.tournamentCategoryId,
                        })),
                    },
                },
                include: {
                    category: true,
                    creator: { select: { id: true, name: true } },
                    status: true,
                    members: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
            });

            const updated = await transaction.tournamentPartnerInvitation.updateMany({
                where: {
                    id,
                    invitedUserId: playerId,
                    status: 'pending',
                    expiresAt: { gt: now },
                },
                data: {
                    status: 'accepted',
                    respondedAt: now,
                    registrationId: registration.id,
                },
            });
            if (updated.count !== 1) {
                throw new RegistrationError(409, 'This partner invitation is no longer pending.');
            }

            return { registration };
        }, { isolationLevel: 'Serializable' });
        const result = await withParticipationConflictHandling(() => resultPromise);

        if (result.expired) {
            throw new RegistrationError(410, 'This partner invitation has expired.');
        }
        return Registration.fromRecord(result.registration);
    }

    async declinePartnerInvitation(userId, invitationId) {
        return this.updatePartnerInvitationStatus(userId, invitationId, 'declined');
    }

    async cancelPartnerInvitation(userId, invitationId) {
        return this.updatePartnerInvitationStatus(userId, invitationId, 'cancelled');
    }

    async updatePartnerInvitationStatus(userId, invitationId, status) {
        const playerId = Number(userId);
        const id = Number(invitationId);
        const now = new Date();
        const result = await this.prisma.$transaction(async (transaction) => {
            const invitation = await transaction.tournamentPartnerInvitation.findUnique({
                where: { id },
            });

            if (!invitation) {
                throw new RegistrationError(404, 'Partner invitation not found.');
            }
            const expectedUserId = status === 'declined'
                ? invitation.invitedUserId
                : invitation.invitedBy;
            if (expectedUserId !== playerId) {
                const actor = status === 'declined' ? 'invited player' : 'inviter';
                throw new RegistrationError(403, `Only the ${actor} can ${status} this invitation.`);
            }
            if (invitation.status !== 'pending') {
                throw new RegistrationError(409, 'Only pending partner invitations can be updated.');
            }
            if (invitation.expiresAt <= now) {
                await transaction.tournamentPartnerInvitation.update({
                    where: { id },
                    data: { status: 'expired', respondedAt: now },
                });
                return { expired: true };
            }

            const updated = await transaction.tournamentPartnerInvitation.updateMany({
                where: {
                    id,
                    status: 'pending',
                    expiresAt: { gt: now },
                },
                data: { status, respondedAt: now },
            });
            if (updated.count !== 1) {
                throw new RegistrationError(409, 'This partner invitation is no longer pending.');
            }

            return {
                invitation: await transaction.tournamentPartnerInvitation.findUnique({
                    where: { id },
                    include: partnerInvitationInclude,
                }),
            };
        }, { isolationLevel: 'Serializable' });

        if (result.expired) {
            throw new RegistrationError(410, 'This partner invitation has expired.');
        }
        return PartnerInvitation.fromRecord(result.invitation);
    }

    assertCategoryAcceptsRegistration(category) {
        if (category.tournament.publicationStatus !== 'published') {
            throw new RegistrationError(409, 'Tournament is not published and cannot accept registrations.');
        }
        if (category.entryStatus !== RegistrationStatus.OPEN) {
            throw new RegistrationError(409, 'Tournament category is not open for registrations.');
        }
        if (![PairingType.DOUBLES, PairingType.MIXED_DOUBLES].includes(category.pairingType)) {
            throw new RegistrationError(400, 'Partner invitations are only available for doubles categories.');
        }
    }

    async findById(id) {
        const registration = await this.prisma.tournamentRegistration.findUnique({
            where: { id: Number(id) },
            include: {
                category: true,
                creator: { select: { id: true, name: true } },
                status: true,
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                    },
                },
            },
        });

        if (!registration) {
            throw new RegistrationError(404, 'Registration not found.');
        }

        return Registration.fromRecord(registration);
    }

    async listStatuses() {
        return this.prisma.tournamentRegistrationStatus.findMany({
            orderBy: { id: 'asc' },
        });
    }

    async listByUser(userId, { page = 1, pageSize = 20 } = {}) {
        const pageNumber = Number(page);
        const limit = Number(pageSize);
        const skip = (pageNumber - 1) * limit;
        const ownerId = Number(userId);

        const [items, total] = await Promise.all([
            this.prisma.tournamentRegistration.findMany({
                where: {
                    registeredBy: ownerId,
                },
                include: {
                    category: true,
                    creator: { select: { id: true, name: true } },
                    status: true,
                    members: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
                orderBy: { registeredAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.tournamentRegistration.count({
                where: {
                    registeredBy: ownerId,
                },
            }),
        ]);

        return {
            items: items.map((item) => Registration.fromRecord(item)),
            pagination: {
                page: pageNumber,
                pageSize: limit,
                total,
                pageCount: total === 0 ? 0 : Math.ceil(total / limit),
            },
        };
    }
}

module.exports = PrismaRegistrationRepository;
