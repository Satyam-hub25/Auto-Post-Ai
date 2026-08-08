"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = __importDefault(require("../db/client"));
const persona_service_1 = require("../services/persona.service");
const scheduler_service_1 = require("../services/scheduler.service");
const router = (0, express_1.Router)();
// ── POST /api/agent/init ──
const InitAgentSchema = zod_1.z.object({
    persona: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Persona name is required'),
        domain: zod_1.z.string().min(1, 'Domain is required'),
    })
});
router.post('/init', async (req, res) => {
    try {
        const { persona } = InitAgentSchema.parse(req.body);
        console.log(`[Init] Creating agent: ${persona.name} (${persona.domain})`);
        // Generate voice guide / system prompt via Claude (or mock)
        const voiceGuide = await persona_service_1.personaService.generateVoiceGuide(persona.name, persona.domain);
        const agent = await client_1.default.agent.create({
            data: {
                personaName: persona.name,
                domain: persona.domain,
                voiceGuide,
                systemPrompt: voiceGuide,
            }
        });
        console.log(`[Init] Agent created: ${agent.id}`);
        // Start the autonomous background loop (non-blocking)
        scheduler_service_1.schedulerService.startAgentSchedule(agent.id).catch(err => {
            console.error(`[Init] Failed to start scheduler for ${agent.id}:`, err);
        });
        res.json({ agentId: agent.id });
    }
    catch (error) {
        console.error('Error initializing agent:', error);
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.errors?.[0]?.message || 'Invalid request body',
                statusCode: 400,
            });
        }
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to initialize agent',
            statusCode: 500,
        });
    }
});
// ── GET /api/agent/list ──
router.get('/list', async (req, res) => {
    try {
        const agents = await client_1.default.agent.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                personaName: true,
                domain: true,
                createdAt: true,
            }
        });
        const mapped = agents.map(a => ({
            id: a.id,
            personaName: a.personaName,
            domain: a.domain,
            createdAt: a.createdAt.toISOString(),
        }));
        res.json({ agents: mapped });
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch agents', statusCode: 500 });
    }
});
// ── GET /api/agent/feed ──
const FeedQuerySchema = zod_1.z.object({
    agentId: zod_1.z.string().min(1, 'Invalid agentId'),
});
router.get('/feed', async (req, res) => {
    try {
        const { agentId } = FeedQuerySchema.parse(req.query);
        const posts = await client_1.default.post.findMany({
            where: { agentId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                text: true,
                rationale: true,
                sources: true,
                createdAt: true,
            }
        });
        // Map to exact API spec: createdAt as ISO 8601 UTC string
        const mappedPosts = posts.map(post => ({
            id: post.id,
            createdAt: post.createdAt.toISOString(),
            text: post.text,
            rationale: post.rationale,
            sources: JSON.parse(post.sources),
        }));
        res.json({ posts: mappedPosts });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Missing or invalid agentId query parameter',
                statusCode: 400,
            });
        }
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch feed',
            statusCode: 500,
        });
    }
});
exports.default = router;
