const PaymentMethod = require('../../domain/entities/PaymentMethod');
const HttpError = require('../../../../shared/errors/HttpError');

class PrismaPaymentMethodRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async create(input) {
        const method = await this.prisma.paymentMethod.create({ data: input });
        return PaymentMethod.fromRecord(method);
    }

    async list({ activeOnly = false } = {}) {
        const methods = await this.prisma.paymentMethod.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        });
        return methods.map((method) => PaymentMethod.fromRecord(method));
    }

    async findById(id) {
        const method = await this.prisma.paymentMethod.findUnique({
            where: { id: Number(id) },
        });
        if (!method) {
            throw new HttpError(404, 'Payment method not found.');
        }
        return PaymentMethod.fromRecord(method);
    }

    async update(id, input) {
        const result = await this.prisma.paymentMethod.updateMany({
            where: { id: Number(id) },
            data: input,
        });
        if (!result.count) {
            throw new HttpError(404, 'Payment method not found.');
        }
        return this.findById(id);
    }

    async setStatus(id, isActive) {
        return this.update(id, { isActive });
    }
}

module.exports = PrismaPaymentMethodRepository;
