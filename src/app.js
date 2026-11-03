require('dotenv').config();

const express = require('express');
const path = require('node:path');
const prisma = require('./shared/database/prisma');
const createAuthModule = require('./bootstrap/auth');
const createTournamentModule = require('./bootstrap/tournaments');
const createRegistrationModule = require('./bootstrap/registrations');
const createUserModule = require('./bootstrap/users');
const errorHandler = require('./shared/middleware/errorHandler');
const notFound = require('./shared/middleware/notFound');

const app = express();
const authModule = createAuthModule({ prisma });
const tournamentRoutes = createTournamentModule({
    prisma,
    authenticate: authModule.authenticate,
});
const registrationRoutes = createRegistrationModule({
    prisma,
    authenticate: authModule.authenticate,
});
const userRoutes = createUserModule({
    prisma,
    authenticate: authModule.authenticate,
});

app.use(express.json());
app.use(
    '/uploads/player-profiles',
    express.static(path.resolve(__dirname, '..', 'uploads', 'player-profiles'), {
        dotfiles: 'deny',
        index: false,
        maxAge: '1d',
    }),
);
app.use(
    '/uploads/tournament-banners',
    express.static(path.resolve(__dirname, '..', 'uploads', 'tournament-banners'), {
        dotfiles: 'deny',
        index: false,
        maxAge: '1d',
    }),
);
app.use('/api/auth', authModule.routes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Node.js API is running!' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
