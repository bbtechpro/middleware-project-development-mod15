// POST /api/users/login
const express = require('express');
const router = express.Router();
const User = require('../../models/userSchema');
const { signToken } = require('../../utils/auth');

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const query = req.query || {};
        const combinedData = { ...query, ...body };

        const { email: rawEmail, password } = combinedData;
        const email = (rawEmail || '').toLowerCase().trim();

        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required.',
                receivedKeys: Object.keys(combinedData),
                expectedKeys: ['email', 'password'],
                note: 'Send data as JSON body with Content-Type: application/json, or as query parameters'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Incorrect email or password.' });
        }

        const passwordIsValid = await user.isCorrectPassword(password);
        if (!passwordIsValid) {
            return res.status(400).json({ message: 'Incorrect email or password.' });
        }

        const token = signToken({
            username: user.username,
            email: user.email,
            _id: user._id,
        });

        const userObj = user.toObject();
        delete userObj.password;

        return res.status(200).json({ token, user: userObj });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
