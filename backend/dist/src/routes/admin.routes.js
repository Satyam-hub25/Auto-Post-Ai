"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = __importDefault(require("../db/client"));
const auth_service_1 = require("../auth/auth.service");
const jwt_middleware_1 = require("../auth/jwt.middleware");
const scheduler_service_1 = require("../services/scheduler.service");
const router = (0, express_1.Router)();
// ── Auth schemas ──
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
// ── Public auth routes ──
router.post('/register', async (req, res) => {
    try {
        const { email, password } = RegisterSchema.parse(req.body);
        const existing = await client_1.default.adminUser.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Conflict', message: 'Email already registered', statusCode: 400 });
        }
        const passwordHash = await auth_service_1.authService.hashPassword(password);
        await client_1.default.adminUser.create({
            data: { email, passwordHash }
        });
        res.status(201).json({ message: 'Admin registered successfully' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors?.[0]?.message, statusCode: 400 });
        }
        res.status(500).json({ error: 'Internal Server Error', message: 'Registration failed', statusCode: 500 });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = LoginSchema.parse(req.body);
        const user = await client_1.default.adminUser.findUnique({ where: { email } });
        if (!user || !(await auth_service_1.authService.comparePassword(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
        }
        const token = auth_service_1.authService.generateToken({ id: user.id, email: user.email });
        res.json({ token });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors?.[0]?.message, statusCode: 400 });
        }
        res.status(500).json({ error: 'Internal Server Error', message: 'Login failed', statusCode: 500 });
    }
});
// ── Public read-only routes (editorial transparency) ──
// These are public so the frontend can show editorial transparency without auth
router.get('/topics/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const candidates = await client_1.default.topicCandidate.findMany({
            where: { agentId },
            orderBy: { discoveredAt: 'desc' },
        });
        const mapped = candidates.map(c => ({
            id: c.id,
            agentId: c.agentId,
            title: c.title,
            summary: c.summary,
            sourceUrl: c.sourceUrl,
            score: c.score,
            status: c.status.toLowerCase(),
            reason: c.reason,
            discoveredAt: c.discoveredAt.toISOString(),
        }));
        res.json({ candidates: mapped });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch topics', statusCode: 500 });
    }
});
router.get('/analytics/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const [candidates, posts] = await Promise.all([
            client_1.default.topicCandidate.findMany({ where: { agentId } }),
            client_1.default.post.findMany({ where: { agentId }, select: { createdAt: true, sources: true } }),
        ]);
        const accepted = candidates.filter(c => c.status === 'ACCEPTED').length;
        const rejected = candidates.filter(c => c.status === 'REJECTED').length;
        // Posts per day
        const postsByDay = new Map();
        for (const post of posts) {
            const day = post.createdAt.toISOString().split('T')[0];
            postsByDay.set(day, (postsByDay.get(day) || 0) + 1);
        }
        const postsPerDay = Array.from(postsByDay.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
        // Top sources
        const sourceCounts = new Map();
        for (const post of posts) {
            const parsedSources = JSON.parse(post.sources);
            for (const source of parsedSources) {
                try {
                    const hostname = new URL(source).hostname;
                    sourceCounts.set(hostname, (sourceCounts.get(hostname) || 0) + 1);
                }
                catch {
                    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
                }
            }
        }
        const topSources = Array.from(sourceCounts.entries())
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        res.json({
            postsPerDay,
            acceptanceRate: { accepted, rejected },
            topSources,
            totalPosts: posts.length,
            totalTopics: candidates.length,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch analytics', statusCode: 500 });
    }
});
router.get('/agent/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const agent = await client_1.default.agent.findUnique({ where: { id: agentId } });
        if (!agent) {
            return res.status(404).json({ error: 'Not Found', message: 'Agent not found', statusCode: 404 });
        }
        res.json({
            agent: {
                id: agent.id,
                personaName: agent.personaName,
                domain: agent.domain,
                voiceGuide: agent.voiceGuide,
                createdAt: agent.createdAt.toISOString(),
            }
        });
    }
    catch (error) {
        console.error('Error fetching agent:', error);
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch agent', statusCode: 500 });
    }
});
// ── Protected admin routes (require JWT, except force-cycle for easy dev triggering) ──
router.post('/force-cycle/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const agent = await client_1.default.agent.findUnique({ where: { id: agentId } });
        if (!agent) {
            return res.status(404).json({ error: 'Not Found', message: 'Agent not found', statusCode: 404 });
        }
        // Trigger cycle non-blocking
        scheduler_service_1.schedulerService.runCycleNow(agentId).catch(err => {
            console.error(`[Force Cycle] Error for ${agentId}:`, err);
        });
        res.json({ message: 'Autonomous cycle triggered', agentId });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to force cycle', statusCode: 500 });
    }
});
router.put('/persona/:agentId', jwt_middleware_1.jwtMiddleware, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { voiceGuide } = zod_1.z.object({ voiceGuide: zod_1.z.string().min(1) }).parse(req.body);
        const agent = await client_1.default.agent.findUnique({ where: { id: agentId } });
        if (!agent) {
            return res.status(404).json({ error: 'Not Found', message: 'Agent not found', statusCode: 404 });
        }
        await client_1.default.agent.update({
            where: { id: agentId },
            data: { voiceGuide, systemPrompt: voiceGuide },
        });
        res.json({ message: 'Persona voice guide updated' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation Error', message: error.errors?.[0]?.message, statusCode: 400 });
        }
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update persona', statusCode: 500 });
    }
});
exports.default = router;
