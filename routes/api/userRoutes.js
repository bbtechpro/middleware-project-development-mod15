const express = require('express');
const router = express.Router();
const registerRouter = require('../../api/users/register');
const loginRouter = require('../../api/users/login');
const User = require('../../models/userSchema');

// Mount register and login routes early to avoid /:id conflicts
router.use('/register', registerRouter);
router.use('/login', loginRouter);

// GET all users from MongoDB
router.get('/', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        return res.status(200).json({ success: true, data: users });
    } catch (err) {
        console.error('Error fetching users:', err);
        return res.status(500).json({ success: false, message: 'Error fetching users' });
    }
});

// GET a specific user by ID from MongoDB
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        return res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

// POST create a new user in MongoDB
router.post('/', async (req, res) => {
    try {
        const { username, email, password } = req.body || {};
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide username, email and password' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'A user with that username or email already exists.' });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        const userObj = newUser.toObject();
        delete userObj.password;
        return res.status(201).json({ success: true, data: userObj });
    } catch (err) {
        console.error('Error creating user:', err);
        return res.status(500).json({ success: false, message: 'Error creating user' });
    }
});

// PUT update an entire user resource in MongoDB
router.put('/:id', async (req, res) => {
    try {
        const updates = { username: req.body.username, email: req.body.email };
        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ success: false, message: 'Error updating user' });
    }
});

// DELETE remove a user from MongoDB
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ success: false, message: 'Error deleting user' });
    }
});

// PATCH update part of a user resource in MongoDB
router.patch('/:id', async (req, res) => {
    try {
        const updates = {};
        if (req.body.username !== undefined) updates.username = req.body.username;
        if (req.body.email !== undefined) updates.email = req.body.email;
        if (req.body.password !== undefined) updates.password = req.body.password;

        const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        console.error('Error patching user:', err);
        return res.status(500).json({ success: false, message: 'Error patching user' });
    }
});

module.exports = router;
