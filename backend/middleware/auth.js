
import { jwtVerify } from 'jose';

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

        if (!token) {
            // Also check cookies if needed, but standard API usually relies on headers
            // token = req.cookies?.auth_token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const secretStr = process.env.EXTERNAL_JWT_SECRET;
        if (!secretStr) {
            console.error('Missing EXTERNAL_JWT_SECRET');
            return res.status(500).json({ error: 'Internal configuration error' });
        }

        const secret = new TextEncoder().encode(secretStr);
        const { payload } = await jwtVerify(token, secret);

        req.user = {
            userId: payload.sub,
            role: payload.role,
            ...payload
        };

        next();
    } catch (error) {
        console.error('Auth verification failed:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

export default authMiddleware;
