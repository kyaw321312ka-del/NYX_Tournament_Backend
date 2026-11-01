require('dotenv').config();

const express = require('express');
const authRoutes = require('./modules/auth');
const userRoutes = require('./modules/users/presentation/routes/userRoutes');
const errorHandler = require('./shared/middleware/errorHandler');
const notFound = require('./shared/middleware/notFound');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Node.js API is running!' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
