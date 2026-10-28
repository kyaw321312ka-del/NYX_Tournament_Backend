
require('dotenv').config();

const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use('/api/auth', require('./src/modules/auth'));

app.get('/', (req, res) => {
    res.json({ message: 'Node.js API is running!' });
});

app.get('/api/users', (req, res) => {
    const users = [
        { id: 1, name: 'Aung Aung' },
        { id: 2, name: 'Mg Mg' }
    ];

    res.status(200).json({
        success: true,
        data: users
    });
});

app.get('/api/users/:id', (req, res) => {
    const id = Number(req.params.id);

    const user = [
        { id: 1, name: 'Aung Aung' },
        { id: 2, name: 'Mg Mg' }
    ].find(user => user.id === id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: user
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.statusCode) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
        });
    }

    console.error('Unhandled request error:', error);
    return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.',
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
