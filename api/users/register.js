// POST /api/users/register
const express = require('express');
const router = express.Router();
const User = require('../../models/userSchema');

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        console.log('Register route hit:', req.method, req.originalUrl, 'content-type=', req.headers['content-type'], 'body=', body);
        const username = body.username || body.Username || body.userName;
        const email = body.email || body.Email;
        const password = body.password || body.Password;

        if (!username || !email || !password) {
            return res.status(400).json({ 
                message: 'Username, email and password are required.',
                receivedKeys: Object.keys(body),
                expectedKeys: ['username', 'email', 'password'],
                note: 'Send raw JSON with Content-Type: application/json, or use x-www-form-urlencoded if not raw JSON.'
            });
        }

        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with that email already exists.' });
        }

        const newUser = new User({ username, email, password });
        try {
            await newUser.save();
        } catch (saveErr) {
            console.error('Error saving new user:', saveErr);
            if (saveErr && saveErr.code === 11000) {
                return res.status(400).json({ message: 'A user with that username or email already exists.' });
            }
            if (saveErr && saveErr.name === 'ValidationError') {
                const messages = Object.values(saveErr.errors).map(e => e.message).join(', ');
                return res.status(400).json({ message: messages });
            }
            return res.status(500).json({ message: 'Error saving user', error: saveErr.message });
        }

        const userObj = newUser.toObject();
        delete userObj.password;

        return res.status(201).json(userObj);
    } catch (err) {
        console.error(err);
        // Handle duplicate key (unique fields)
        if (err && err.code === 11000) {
            return res.status(400).json({ message: 'Duplicate field value entered.' });
        }

        // Mongoose validation errors
        if (err && err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message).join(', ');
            return res.status(400).json({ message: messages });
        }

        return res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;