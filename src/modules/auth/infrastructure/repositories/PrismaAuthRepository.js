const PendingRegistration = require('../../domain/entities/PendingRegistration');
const AuthError = require('../../application/AuthError');

class PrismaAuthRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async findUserById(id) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  async savePendingRegistration(data) {
    const record = await this.prisma.pendingRegistration.upsert({
      where: { email: data.email },
      create: data,
      update: {
        ...data,
        attempts: 0,
      },
    });
    return PendingRegistration.fromRecord(record);
  }

  async findPendingRegistration(email) {
    const record = await this.prisma.pendingRegistration.findUnique({
      where: { email },
    });
    return PendingRegistration.fromRecord(record);
  }

  async incrementPendingAttempts(id) {
    return this.prisma.pendingRegistration.updateMany({
      where: { id, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
  }

  async deletePendingRegistration(id) {
    return this.prisma.pendingRegistration.deleteMany({ where: { id } });
  }

  async completePendingRegistration(pending) {
    return this.prisma.$transaction(async (transaction) => {
      const role = await transaction.role.upsert({
        where: { name: 'user' },
        create: { name: 'user' },
        update: {},
      });
      const user = await transaction.user.create({
        data: {
          roleId: role.id,
          name: pending.name,
          phno: pending.phno,
          email: pending.email,
          passwordHash: pending.passwordHash,
          emailVerifiedAt: new Date(),
        },
        include: { role: true },
      });
      const deleted = await transaction.pendingRegistration.deleteMany({
        where: { id: pending.id, attempts: { lt: 5 } },
      });

      if (deleted.count !== 1) {
        throw new AuthError(409, 'This registration can no longer be verified. Register again to request a new code.');
      }

      return user;
    });
  }
}

module.exports = PrismaAuthRepository;