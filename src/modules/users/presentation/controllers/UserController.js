const users = [
    { id: 1, name: 'Aung Aung' },
    { id: 2, name: 'Mg Mg' },
];

function listUsers(req, res) {
    return res.status(200).json({
        success: true,
        data: users,
    });
}

function getUser(req, res) {
    const id = Number(req.params.id);
    const user = users.find((item) => item.id === id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
        });
    }

    return res.status(200).json({
        success: true,
        data: user,
    });
}

module.exports = { listUsers, getUser };
