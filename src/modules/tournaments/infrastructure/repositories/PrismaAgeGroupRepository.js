const HttpError = require('../../../../shared/errors/HttpError');

class PrismaAgeGroupRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }

    async list() {
        return this.prisma.ageGroup.findMany({
            orderBy: [{ age: 'asc' }, { id: 'asc' }],
        });
    }

    async findById(id) {
        const ageGroup = await this.prisma.ageGroup.findUnique({
            where: { id: Number(id) },
        });
        if (!ageGroup) {
            throw new HttpError(404, 'Age group not found.');
        }
        return ageGroup;
    }

    async create(input) {
        const existing = await this.prisma.ageGroup.findUnique({
            where: {
                name_age: {
                    name: input.name,
                    age: input.age,
                },
            },
        });
        if (existing) {
            throw new HttpError(409, 'An age group with this name and maximum age already exists.');
        }
        return this.prisma.ageGroup.create({ data: input });
    }

    async update(id, input) {
        await this.findById(id);
        const current = await this.prisma.ageGroup.findUnique({
            where: { id: Number(id) },
        });
        const name = input.name ?? current.name;
        const age = input.age ?? current.age;
        const duplicate = await this.prisma.ageGroup.findFirst({
            where: {
                name,
                age,
                id: { not: Number(id) },
            },
        });
        if (duplicate) {
            throw new HttpError(409, 'An age group with this name and maximum age already exists.');
        }
        return this.prisma.ageGroup.update({
            where: { id: Number(id) },
            data: input,
        });
    }

    async remove(id) {
        await this.findById(id);
        const inUseCount = await this.prisma.tournamentCategory.count({
            where: { ageGroupId: Number(id) },
        });
        if (inUseCount > 0) {
            throw new HttpError(409, 'Cannot delete an age group that is assigned to tournament categories.');
        }
        await this.prisma.ageGroup.delete({
            where: { id: Number(id) },
        });
    }
}

module.exports = PrismaAgeGroupRepository;
