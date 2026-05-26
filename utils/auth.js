const jwt = require('jsonwebtoken');
 
const secret = process.env.JWT_SECRET;
const expiration = process.env.JWT_EXPIRES_IN || '1h';
 
module.exports = {
  authMiddleware: function (req, res, next) {
    let token = (req.body && req.body.token) || req.query.token || req.headers.authorization;

    if (req.headers.authorization) {
      token = token.split(' ').pop().trim();
    }
 
    if (!token) {
      return res.status(401).json({ message: 'You must be logged in to do that.' });
    }
 
    try {
      if (!secret) {
        return res.status(500).json({ message: 'JWT_SECRET is not configured.' });
      }

      const decoded = jwt.verify(token, secret, { maxAge: expiration });
      // Backward compatible: accept both token shapes:
      // 1) { data: { username, email, _id } } (preferred)
      // 2) { id, username, ... } (older payload)
      const data = decoded?.data ?? decoded;

      // Normalize _id field across payload shapes
      if (data && data.id && !data._id) data._id = data.id;

      req.user = data;
    } catch {
      console.log('Invalid token');
      return res.status(401).json({ message: 'Invalid token.' });
    }
 
    next();
  },
  signToken: function ({ username, email, _id }) {
    const payload = { username, email, _id };
 
    return jwt.sign({ data: payload }, secret, { expiresIn: expiration });
  },
};