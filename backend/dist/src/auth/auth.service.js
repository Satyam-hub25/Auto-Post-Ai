"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class AuthService {
    async hashPassword(password) {
        return bcrypt_1.default.hash(password, 10);
    }
    async comparePassword(password, hash) {
        return bcrypt_1.default.compare(password, hash);
    }
    generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, config_1.config.JWT_SECRET, { expiresIn: '1d' });
    }
    verifyToken(token) {
        return jsonwebtoken_1.default.verify(token, config_1.config.JWT_SECRET);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
