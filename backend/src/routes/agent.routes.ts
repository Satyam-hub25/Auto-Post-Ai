import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { personaService } from '../services/persona.service';
import { schedulerService } from '../services/scheduler.service';

const router = Router();

// ── POST /api/agent/init ──
const InitAgentSchema = z.object({
  persona: z.object({
    name: z.string().min(1, 'Persona name is required'),
    domain: z.string().min(1, 'Domain is required'),
  })
});

router.post('/init', async (req: Request, res: Response) => {
  try {
    const { persona } = InitAgentSchema.parse(req.body);

    console.log(`[Init] Creating agent: ${persona.name} (${persona.domain})`);

    // Generate voice guide / system prompt via Claude (or mock)
    const voiceGuide = await personaService.generateVoiceGuide(persona.name, persona.domain);

    const agent = await prisma.agent.create({
      data: {
        personaName: persona.name,
        domain: persona.domain,
        voiceGuide,
        systemPrompt: voiceGuide,
      }
    });

    console.log(`[Init] Agent created: ${agent.id}`);

    // Start the autonomous background loop (non-blocking)
    schedulerService.startAgentSchedule(agent.id).catch(err => {
      console.error(`[Init] Failed to start scheduler for ${agent.id}:`, err);
    });

    res.json({ agentId: agent.id });
  } catch (error: any) {
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
router.get('/list', async (req: Request, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch agents', statusCode: 500 });
  }
});

// ── GET /api/agent/feed ──
const FeedQuerySchema = z.object({
  agentId: z.string().min(1, 'Invalid agentId'),
});

router.get('/feed', async (req: Request, res: Response) => {
  try {
    const { agentId } = FeedQuerySchema.parse(req.query);

    const posts = await prisma.post.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        text: true,
        rationale: true,
        sources: true,
        createdAt: true,
        candidatesCount: true,
        topicId: true,
      }
    });

    const topicIds = posts.map(p => p.topicId).filter(id => id) as string[];
    const topics = await prisma.topicCandidate.findMany({
      where: { id: { in: topicIds } }
    });
    
    const topicMap = new Map(topics.map(t => [t.id, t]));

    // Map to exact API spec: createdAt as ISO 8601 UTC string
    const mappedPosts = posts.map(post => {
      let scores = null;
      if (post.topicId && topicMap.has(post.topicId)) {
        const topicData = topicMap.get(post.topicId);
        if (topicData?.evaluationData) {
          scores = topicData.evaluationData;
        }
      }

      return {
        id: post.id,
        createdAt: post.createdAt.toISOString(),
        text: post.text,
        rationale: post.rationale,
        sources: JSON.parse(post.sources as string),
        candidatesCount: post.candidatesCount || 0,
        scores,
      };
    });

    res.json({ posts: mappedPosts });
  } catch (error: any) {
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

export default router;
