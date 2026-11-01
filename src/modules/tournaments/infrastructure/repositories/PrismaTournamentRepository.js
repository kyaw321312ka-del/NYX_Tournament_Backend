const TournamentRepository = require('../../domain/repositories/TournamentRepository');
const Tournament = require('../../domain/entities/Tournament');
const TournamentError = require('../../domain/errors/TournamentError');
const PublicationStatus = require('../../domain/enums/PublicationStatus');

const tournamentInclude = {
    creator: { select: { id: true, name: true } },
    venues: { orderBy: { id: 'asc' } },
    rules: { orderBy: { sortOrder: 'asc' } },
    categories: {
        orderBy: { id: 'asc' },
        include: { pointTiers: { orderBy: { position: 'asc' } } },
    },
};

class PrismaTournamentRepository extends TournamentRepository {
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }

    async create(createdBy, data) {
        const record = await this.prisma.tournament.create({
            data: {
                createdBy,
                title: data.title,
                entryFee: data.entryFee,
                bannerUrl: data.bannerUrl,
                description: data.description,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                rankingPointsPool: data.rankingPointsPool,
                venues: data.venues.length ? { create: data.venues } : undefined,
                rules: data.rules.length ? { create: data.rules } : undefined,
                categories: data.categories.length ? {
                    create: data.categories.map((category) => ({
                        ...category,
                        pointTiers: category.pointTiers?.length
                            ? { create: category.pointTiers }
                            : undefined,
                    })),
                } : undefined,
            },
            include: tournamentInclude,
        });
        return Tournament.fromRecord(record);
    }

    async findById(id) {
        const record = await this.prisma.tournament.findUnique({
            where: { id },
            include: tournamentInclude,
        });
        return Tournament.fromRecord(record);
    }

    async list({ page, pageSize, userId }) {
        const visibilityFilter = userId === null
            ? { publicationStatus: PublicationStatus.PUBLISHED }
            : {
                OR: [
                    { publicationStatus: PublicationStatus.PUBLISHED },
                    { createdBy: userId },
                ],
            };
        const [records, total] = await this.prisma.$transaction([
            this.prisma.tournament.findMany({
                where: visibilityFilter,
                orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: tournamentInclude,
            }),
            this.prisma.tournament.count({ where: visibilityFilter }),
        ]);
        return {
            items: records.map(Tournament.fromRecord),
            pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) },
        };
    }

    async updateOwned(id, userId, data) {
        const existing = await this.prisma.tournament.findFirst({
            where: { id, createdBy: userId },
            select: {
                id: true,
                publicationStatus: true,
                startDate: true,
                endDate: true,
            },
        });
        if (!existing) {
            throw new TournamentError(404, 'Tournament not found.');
        }
        if (existing.publicationStatus !== PublicationStatus.DRAFT) {
            throw new TournamentError(409, 'Published tournaments cannot be edited.');
        }
        const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
        if (endDate < startDate) {
            throw new TournamentError(400, 'End date must be on or after start date.');
        }

        const scalarData = {};
        for (const field of ['title', 'entryFee', 'bannerUrl', 'description', 'rankingPointsPool']) {
            if (data[field] !== undefined) {
                scalarData[field] = data[field];
            }
        }
        if (data.startDate !== undefined) scalarData.startDate = new Date(data.startDate);
        if (data.endDate !== undefined) scalarData.endDate = new Date(data.endDate);

        const record = await this.prisma.$transaction(async (transaction) => {
            const createData = { ...scalarData };
            for (const [field, model] of [
                ['venues', 'tournamentVenue'],
                ['rules', 'tournamentRule'],
                ['categories', 'tournamentCategory'],
            ]) {
                if (data[field] !== undefined) {
                    await transaction[model].deleteMany({ where: { tournamentId: id } });
                    createData[field] = { create: data[field].map((item) => {
                        if (field !== 'categories') return item;
                        const { pointTiers, ...category } = item;
                        return {
                            ...category,
                            pointTiers: pointTiers?.length ? { create: pointTiers } : undefined,
                        };
                    }) };
                }
            }
            return transaction.tournament.update({
                where: { id },
                data: createData,
                include: tournamentInclude,
            });
        });
        return Tournament.fromRecord(record);
    }

    async publishOwned(id, userId) {
        const existing = await this.prisma.tournament.findUnique({
            where: { id },
            select: { id: true, createdBy: true, publicationStatus: true },
        });
        if (!existing || existing.createdBy !== userId) {
            throw new TournamentError(404, 'Tournament not found.');
        }
        if (existing.publicationStatus === PublicationStatus.PUBLISHED) {
            throw new TournamentError(409, 'Tournament is already published.');
        }

        const record = await this.prisma.tournament.update({
            where: { id },
            data: { publicationStatus: PublicationStatus.PUBLISHED },
            include: tournamentInclude,
        });
        return Tournament.fromRecord(record);
    }

    async deleteOwned(id, userId) {
        const result = await this.prisma.tournament.deleteMany({ where: { id, createdBy: userId } });
        if (result.count !== 1) {
            throw new TournamentError(404, 'Tournament not found.');
        }
    }
}

module.exports = PrismaTournamentRepository;
