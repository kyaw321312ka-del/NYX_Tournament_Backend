const HttpError = require('../../../shared/errors/HttpError');

const CONTACT_SUPPORT_ID = 1;

class PrismaContactSupportRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async get() {
        const contactSupport = await this.prisma.contactSupport.findUnique({
            where: { id: CONTACT_SUPPORT_ID },
        });
        if (!contactSupport) {
            throw new HttpError(404, 'Contact and support details not found.');
        }
        return contactSupport;
    }

    async create(input) {
        const existing = await this.prisma.contactSupport.findUnique({
            where: { id: CONTACT_SUPPORT_ID },
        });
        if (existing) {
            throw new HttpError(409, 'Contact and support details already exist.');
        }
        try {
            return await this.prisma.contactSupport.create({
                data: { id: CONTACT_SUPPORT_ID, ...input },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new HttpError(409, 'Contact and support details already exist.');
            }
            throw error;
        }
    }

    update(input) {
        return this.prisma.contactSupport.upsert({
            where: { id: CONTACT_SUPPORT_ID },
            create: { id: CONTACT_SUPPORT_ID, ...input },
            update: input,
        });
    }

    async remove() {
        await this.get();
        await this.prisma.contactSupport.delete({
            where: { id: CONTACT_SUPPORT_ID },
        });
    }
}

module.exports = PrismaContactSupportRepository;
