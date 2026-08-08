"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const agent_routes_1 = __importDefault(require("./routes/agent.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const app = (0, express_1.default)();
// Trust proxy for Render deployment (fixes express-rate-limit warning)
app.set('trust proxy', 1);
// Security and middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting on public API endpoints
const publicLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', message: 'Rate limit exceeded. Try again later.', statusCode: 429 },
});
app.use('/api/agent', publicLimiter);
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
app.use('/api/agent', agent_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
// Structured JSON error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
        statusCode,
    });
});
// Start server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = config_1.config.PORT;
    app.listen(PORT, async () => {
        console.log(`\n🚀 Autonomous AI Creator Backend running on port ${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/api/health`);
        console.log(`   Mistral API: ${config_1.config.MISTRAL_API_KEY ? '✅ Configured' : '⚠️  Not configured (mock mode)'}`);
        console.log(`   Discovery: ${config_1.config.DISCOVERY_SOURCE}`);
        console.log(`   Schedule: ${config_1.config.CRON_INTERVAL_MIN}-${config_1.config.CRON_INTERVAL_MAX} min intervals\n`);
        // Restore cron jobs for all existing agents
        try {
            const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
            const prisma = new PrismaClient();
            const { schedulerService } = await Promise.resolve().then(() => __importStar(require('./services/scheduler.service')));
            const agents = await prisma.agent.findMany();
            console.log(`[Boot] Found ${agents.length} existing agents. Restoring schedules...`);
            for (const agent of agents) {
                schedulerService.startAgentSchedule(agent.id).catch(err => {
                    console.error(`[Boot] Failed to start schedule for agent ${agent.id}:`, err);
                });
            }
        }
        catch (err) {
            console.error(`[Boot] Failed to restore agent schedules:`, err);
        }
    });
}
exports.default = app;
