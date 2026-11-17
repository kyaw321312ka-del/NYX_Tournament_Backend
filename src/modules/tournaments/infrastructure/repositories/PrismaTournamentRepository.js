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
        include: {
            eventCategory: { select: { categoryCode: true, name: true, pairingType: true } },
            ageGroup: {
                select: {
                    id: true,
                    name: true,
                    age: true,
                },
            },
            pointTiers: { orderBy: { position: 'asc' } },
        },
    },
};

function normalizeCategoryName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeAgeGroupName(name) {
    return name.toLowerCase();
}

async function resolveTournamentCategories(database, categories) {
    if (!categories.length) return [];

    const definitions = await database.category.findMany({
        where: { categoryCode: { in: [...new Set(categories.map(({ categoryCode }) => categoryCode))] } },
        select: { id: true, categoryCode: true, name: true, pairingType: true },
    });
    const definitionsByCode = new Map(
        definitions.map((definition) => [definition.categoryCode, definition]),
    );

    const ageGroupsByName = new Map();
    for (const { ageGroup } of categories) {
        if (!ageGroup) continue;
        const key = JSON.stringify([normalizeAgeGroupName(ageGroup.name), ageGroup.age]);
        const existing = ageGroupsByName.get(key);
        ageGroupsByName.set(key, ageGroup);
    }

    const ageGroupIds = new Map();
    for (const [key, ageGroup] of ageGroupsByName) {
        const record = await database.ageGroup.upsert({
            where: {
                name_age: { name: ageGroup.name, age: ageGroup.age },
            },
            create: {
                name: ageGroup.name,
                age: ageGroup.age,
            },
            update: {},
        });
        ageGroupIds.set(key, record.id);
    }

    const resolvedCategories = categories.map(({
        categoryCode,
        categoryName,
        pairingType,
        ageGroup,
        ...category
    }) => {
        const definition = definitionsByCode.get(categoryCode);
        if (!definition) {
            throw new TournamentError(400, `Unknown tournament category code: ${categoryCode}.`);
        }
        if (normalizeCategoryName(categoryName) !== normalizeCategoryName(definition.name)) {
            throw new TournamentError(400, `Category name does not match code ${categoryCode}.`);
        }
        if (pairingType !== definition.pairingType) {
            throw new TournamentError(400, `Pairing type does not match category ${categoryCode}.`);
        }

        return {
            ...category,
            categoryId: definition.id,
            ageGroupId: ageGroup
                ? ageGroupIds.get(JSON.stringify([normalizeAgeGroupName(ageGroup.name), ageGroup.age]))
                : null,
        };
    });

    const categoryKeys = new Set();
    for (const [index, category] of resolvedCategories.entries()) {
        const key = JSON.stringify([
            category.categoryId,
            categories[index].ageGroup
                ? JSON.stringify([
                    normalizeAgeGroupName(categories[index].ageGroup.name),
                    categories[index].ageGroup.age,
                ])
                : null,
        ]);
        if (categoryKeys.has(key)) {
            throw new TournamentError(400, 'A category cannot be added more than once with the same age group.');
        }
        categoryKeys.add(key);
    }

    return resolvedCategories;
}

class PrismaTournamentRepository extends TournamentRepository {
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }

    async create(createdBy, data) {
        return this.prisma.$transaction(async (transaction) => {
            const created = await transaction.tournament.create({
                data: {
                    createdBy,
                    title: data.title,
                    bannerUrl: data.bannerUrl,
                    description: data.description,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    rankingPointsPool: data.rankingPointsPool,
                    venues: data.venues.length ? { create: data.venues } : undefined,
                    rules: data.rules.length ? { create: data.rules } : undefined,
                },
                select: { id: true },
            });
            const categories = await resolveTournamentCategories(transaction, data.categories);
            for (const category of categories) {
                const { pointTiers, ...categoryData } = category;
                await transaction.tournamentCategory.create({
                    data: {
                        tournamentId: created.id,
                        ...categoryData,
                        pointTiers: pointTiers?.length ? { create: pointTiers } : undefined,
                    },
                });
            }

            const record = await transaction.tournament.findUnique({
                where: { id: created.id },
                include: tournamentInclude,
            });
            return Tournament.fromRecord(record);
        });
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
                bannerUrl: true,
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
        for (const field of ['title', 'bannerUrl', 'description', 'rankingPointsPool']) {
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
                    const items = field === 'categories'
                        ? await resolveTournamentCategories(transaction, data.categories)
                        : data[field];
                    await transaction[model].deleteMany({ where: { tournamentId: id } });
                    createData[field] = { create: items.map((item) => {
                        if (field !== 'categories') return item;
                        const { pointTiers, ...category } = item;
                        return {
                            ...category,
                            pointTiers: pointTiers?.length ? { create: pointTiers } : undefined,
                        };
                    }) };
                }
            }
            const tournament = await transaction.tournament.update({
                where: { id },
                data: createData,
                include: tournamentInclude,
            });
            return {
                tournament,
                previousBannerUrl: existing.bannerUrl,
            };
        });
        return {
            tournament: Tournament.fromRecord(record.tournament),
            previousBannerUrl: record.previousBannerUrl,
        };
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
