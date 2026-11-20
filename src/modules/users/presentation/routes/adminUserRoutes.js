const express = require('express');
const validateRequest = require('../../../../shared/middleware/validateRequest');
const UserController = require('../controllers/UserController');
const userSchemas = require('../validators/userSchemas');

function createAdminUserRouter({
    authenticate,
    requireAdmin,
    listAdminPlayers,
    getAdminPlayerDetails,
}) {
    const router = express.Router();

    router.get(
        '/admin/users/:userId',
        authenticate,
        requireAdmin,
        validateRequest(userSchemas.userIdSchema, 'params'),
        UserController.createGetAdminPlayerDetailsController(getAdminPlayerDetails),
    );
    router.get(
        '/admin/users',
        authenticate,
        requireAdmin,
        validateRequest(userSchemas.listAdminPlayersSchema, 'query'),
        UserController.createListAdminPlayersController(listAdminPlayers),
    );

    return router;
}

module.exports = createAdminUserRouter;
