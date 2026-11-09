const HttpError = require('../errors/HttpError');

function createRequireAdmin(prisma) {
    return async (req, res, next) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.auth.userId },
                select: { role: { select: { name: true } } },
            });
            if (!user || user.role.name !== 'admin') {
                return next(new HttpError(403, 'Only administrators can access this resource.'));
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = createRequireAdmin;
