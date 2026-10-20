
const express = require('express');

const app = express();
const PORT = 3000;

// Parse incoming JSON request bodies
app.use(express.json());

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Node.js API is running!'
    });
});

// Get all users (temporary sample data)
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

// Get one user by ID
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
