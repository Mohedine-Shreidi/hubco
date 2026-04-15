import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Authentication middleware.
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to req.user.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (err) {
        const message = err.name === 'TokenExpiredError'
            ? 'Token has expired.'
            : 'Invalid token.';
        return res.status(401).json({ success: false, message });
    }
};

export default authenticate;
