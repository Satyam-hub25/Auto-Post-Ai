"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const configSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(3001),
    DATABASE_URL: zod_1.z.string().default('postgresql://postgres:postgres@localhost:5432/ai_creator'),
    JWT_SECRET: zod_1.z.string().default('super-secret-key-change-in-prod'),
    MISTRAL_API_KEY: zod_1.z.string().optional(),
    CRON_INTERVAL_MIN: zod_1.z.coerce.number().default(60),
    CRON_INTERVAL_MAX: zod_1.z.coerce.number().default(240),
    DISCOVERY_SOURCE: zod_1.z.string().default('hackernews'),
    FRONTEND_URL: zod_1.z.string().default('http://localhost:5173'),
    MIN_ACCEPT_SCORE: zod_1.z.coerce.number().default(80),
    MIN_CONSIDER_SCORE: zod_1.z.coerce.number().default(65),
});
exports.config = configSchema.parse(process.env);
