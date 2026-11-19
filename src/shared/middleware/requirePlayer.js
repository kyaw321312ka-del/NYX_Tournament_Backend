const HttpError = require('../errors/HttpError');

function createRequirePlayer(prisma) {
    return async (req, res, next) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.auth.userId },
                select: { role: { select: { name: true } } },
            });
            if (!user || user.role.name !== 'user') {
                return next(new HttpError(403, 'Only players can access this resource.'));
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}

module.exports = createRequirePlayer;
