"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtMiddleware = void 0;
const auth_service_1 = require("./auth.service");
const jwtMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = auth_service_1.authService.verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
exports.jwtMiddleware = jwtMiddleware;
