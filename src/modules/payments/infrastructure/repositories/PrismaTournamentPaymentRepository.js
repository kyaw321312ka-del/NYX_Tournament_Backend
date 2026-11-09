const TournamentPayment = require('../../domain/entities/TournamentPayment');
const PaymentError = require('../../domain/errors/PaymentError');

const paymentInclude = {
    registration: {
        include: {
            status: { select: { name: true } },
            category: {
                include: {
                    tournament: { select: { id: true, title: true } },
                },
            },
            creator: { select: { id: true, name: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, name: true, email: true } },
                },
            },
        },
    },
};

class PrismaTournamentPaymentRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async submit({ userId, registrationId, paymentMethodId, proofImageUrl, transactionReference }) {
        const id = Number(registrationId);
        const ownerId = Number(userId);
        const methodId = Number(paymentMethodId);
        const payment = await this.prisma.$transaction(async (transaction) => {
            const rows = await transaction.$queryRaw`
                SELECT id FROM tournament_registrations WHERE id = ${id} FOR UPDATE
            `;
            if (!rows.length) {
                throw new PaymentError(404, 'Registration not found.');
            }

            const registration = await transaction.tournamentRegistration.findUnique({
                where: { id },
                include: {
                    status: { select: { name: true } },
                    category: { select: { entryFee: true } },
                },
            });
            if (registration.registeredBy !== ownerId) {
                throw new PaymentError(403, 'Only the registration creator can submit its payment.');
            }
            if (registration.status.name !== 'pending') {
                throw new PaymentError(409, 'Payment can only be submitted for a pending registration.');
            }

            const methodRows = await transaction.$queryRaw`
                SELECT id FROM payment_methods WHERE id = ${methodId} FOR UPDATE
            `;
            if (!methodRows.length) {
                throw new PaymentError(404, 'Payment method not found.');
            }
            const paymentMethod = await transaction.paymentMethod.findUnique({
                where: { id: methodId },
            });
            if (!paymentMethod.isActive) {
                throw new PaymentError(409, 'This payment method is inactive.');
            }

            const existing = await transaction.tournamentPayment.findFirst({
                where: {
                    registrationId: id,
                    status: { in: ['submitted', 'paid'] },
                },
                select: { id: true, status: true },
            });
            if (existing) {
                throw new PaymentError(
                    409,
                    existing.status === 'paid'
                        ? 'This registration already has a paid payment.'
                        : 'A payment screenshot is already awaiting verification.',
                );
            }

            return transaction.tournamentPayment.create({
                data: {
                    registrationId: id,
                    paymentMethodId: methodId,
                    paymentMethodName: paymentMethod.paymentMethodName,
                    accountName: paymentMethod.accountName,
                    accountNumber: paymentMethod.accountNumber,
                    amount: registration.category.entryFee,
                    currency: 'MMK',
                    proofImageUrl,
                    transactionReference,
                    status: 'submitted',
                },
                include: paymentInclude,
            });
        }, { isolationLevel: 'Serializable' });

        return TournamentPayment.fromRecord(payment);
    }

    async list({ status, page, pageSize }) {
        const where = { status };
        const [items, total] = await Promise.all([
            this.prisma.tournamentPayment.findMany({
                where,
                include: paymentInclude,
                orderBy: { createdAt: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.tournamentPayment.count({ where }),
        ]);
        return {
            items: items.map((item) => TournamentPayment.fromRecord(item)),
            pagination: {
                page,
                pageSize,
                total,
                pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
            },
        };
    }

    async listMine(userId, { page, pageSize }) {
        const where = {
            registration: {
                registeredBy: Number(userId),
            },
        };
        const [items, total] = await Promise.all([
            this.prisma.tournamentPayment.findMany({
                where,
                include: paymentInclude,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.tournamentPayment.count({ where }),
        ]);
        return {
            items: items.map((item) => TournamentPayment.fromRecord(item)),
            pagination: {
                page,
                pageSize,
                total,
                pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
            },
        };
    }

    async listPending({ page, pageSize }) {
        return this.list({ status: 'submitted', page, pageSize });
    }

    async review({ adminId, paymentId, decision, rejectionReason }) {
        if (!['approve', 'reject'].includes(decision)) {
            throw new PaymentError(400, 'Payment review decision must be approve or reject.');
        }

        const id = Number(paymentId);
        const reviewedAt = new Date();
        const result = await this.prisma.$transaction(async (transaction) => {
            const existing = await transaction.tournamentPayment.findUnique({
                where: { id },
                select: { registrationId: true },
            });
            if (!existing) {
                throw new PaymentError(404, 'Payment not found.');
            }

            await transaction.$queryRaw`
                SELECT id FROM tournament_registrations WHERE id = ${existing.registrationId} FOR UPDATE
            `;

            const payment = await transaction.tournamentPayment.findUnique({
                where: { id },
                include: { registration: { include: { status: { select: { name: true } } } } },
            });
            if (payment.status !== 'submitted') {
                throw new PaymentError(409, 'Only submitted payments can be reviewed.');
            }
            if (payment.registration.status.name !== 'pending') {
                throw new PaymentError(409, 'Payment can only be reviewed for a pending registration.');
            }

            if (decision === 'approve') {
                const previouslyPaid = await transaction.tournamentPayment.findFirst({
                    where: {
                        registrationId: payment.registrationId,
                        status: 'paid',
                        id: { not: id },
                    },
                    select: { id: true },
                });
                if (previouslyPaid) {
                    throw new PaymentError(409, 'This registration already has a paid payment.');
                }

                const confirmedStatus = await transaction.tournamentRegistrationStatus.upsert({
                    where: { name: 'confirmed' },
                    update: {},
                    create: { name: 'confirmed' },
                });
                await transaction.tournamentRegistration.update({
                    where: { id: payment.registrationId },
                    data: { statusId: confirmedStatus.id },
                });
            }

            return transaction.tournamentPayment.update({
                where: { id },
                data: {
                    status: decision === 'approve' ? 'paid' : 'rejected',
                    verifiedBy: Number(adminId),
                    verifiedAt: reviewedAt,
                    rejectionReason: decision === 'reject' ? rejectionReason : null,
                },
                include: paymentInclude,
            });
        }, { isolationLevel: 'Serializable' });

        return TournamentPayment.fromRecord(result);
    }

    async findProofFilename(paymentId) {
        const payment = await this.prisma.tournamentPayment.findUnique({
            where: { id: Number(paymentId) },
            select: { proofImageUrl: true },
        });
        if (!payment) {
            throw new PaymentError(404, 'Payment not found.');
        }
        return payment.proofImageUrl;
    }
}

module.exports = PrismaTournamentPaymentRepository;
