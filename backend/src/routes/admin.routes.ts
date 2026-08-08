import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../db/client';
import { authService } from '../auth/auth.service';
import { jwtMiddleware } from '../auth/jwt.middleware';
import { schedulerService } from '../services/scheduler.service';

const router = Router();

// ── Auth schemas ──
const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ── Public auth routes ──
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = RegisterSchema.parse(req.body);

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Conflict', message: 'Email already registered', statusCode: 400 });
    }

    const passwordHash = await authService.hashPassword(password);
    await prisma.adminUser.create({
      data: { email, passwordHash }
    });

    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', message: error.errors?.[0]?.message, statusCode: 400 });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Registration failed', statusCode: 500 });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user || !(await authService.comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 });
    }

    const token = authService.generateToken({ id: user.id, email: user.email });
    res.json({ token });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', message: error.errors?.[0]?.message, statusCode: 400 });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Login failed', statusCode: 500 });
  }
});

// ── Public read-only routes (editorial transparency) ──
// These are public so the frontend can show editorial transparency without auth
router.get('/topics/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const candidates = await prisma.topicCandidate.findMany({
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
      status: c.status.toLowerCase() as 'accepted' | 'rejected',
      reason: c.reason,
      discoveredAt: c.discoveredAt.toISOString(),
    }));

    res.json({ candidates: mapped });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch topics', statusCode: 500 });
  }
});

router.get('/analytics/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const [candidates, posts] = await Promise.all([
      prisma.topicCandidate.findMany({ where: { agentId } }),
      prisma.post.findMany({ where: { agentId }, select: { createdAt: true, sources: true } }),
    ]);

    const accepted = candidates.filter(c => c.status === 'ACCEPTED').length;
    const rejected = candidates.filter(c => c.status === 'REJECTED').length;

    // Posts per day
    const postsByDay = new Map<string, number>();
    for (const post of posts) {
      const day = post.createdAt.toISOString().split('T')[0];
      postsByDay.set(day, (postsByDay.get(day) || 0) + 1);
    }
    const postsPerDay = Array.from(postsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top sources
    const sourceCounts = new Map<string, number>();
    for (const post of posts) {
      const parsedSources = JSON.parse(post.sources as string);
      for (const source of parsedSources) {
        try {
          const hostname = new URL(source).hostname;
          sourceCounts.set(hostname, (sourceCounts.get(hostname) || 0) + 1);
        } catch {
          sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
        }
      }
    }
    const topSources = Array.from(sourceCounts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Score Averages
    let totalScore = 0, totalNovelty = 0, totalSubstance = 0, totalCredibility = 0, totalRelevance = 0, totalTimeliness = 0;
    let evalCount = 0;
    const rejectionReasons = new Map<string, number>();

    for (const c of candidates) {
      if (c.evaluationData) {
        const d: any = c.evaluationData;
        totalScore += d.score || 0;
        totalNovelty += d.novelty || 0;
        totalSubstance += d.substance || 0;
        totalCredibility += d.credibility || 0;
        totalRelevance += d.relevance || 0;
        totalTimeliness += d.timeliness || 0;
        evalCount++;
      }
      if (c.status === 'REJECTED' && c.reason) {
        // Simplify reason by taking first sentence or up to 60 chars to group them
        const baseReason = c.reason.split('.')[0].substring(0, 60);
        rejectionReasons.set(baseReason, (rejectionReasons.get(baseReason) || 0) + 1);
      }
    }

    const averages = evalCount > 0 ? {
      score: Math.round(totalScore / evalCount),
      novelty: Math.round(totalNovelty / evalCount),
      substance: Math.round(totalSubstance / evalCount),
      credibility: Math.round(totalCredibility / evalCount),
      relevance: Math.round(totalRelevance / evalCount),
      timeliness: Math.round(totalTimeliness / evalCount),
    } : null;

    const topRejections = Array.from(rejectionReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      postsPerDay,
      acceptanceRate: { accepted, rejected },
      topSources,
      totalPosts: posts.length,
      totalTopics: candidates.length,
      averages,
      topRejections,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch analytics', statusCode: 500 });
  }
});

router.get('/agent/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
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
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to fetch agent', statusCode: 500 });
  }
});

// ── Protected admin routes (require JWT, except force-cycle for easy dev triggering) ──
router.post('/force-cycle/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return res.status(404).json({ error: 'Not Found', message: 'Agent not found', statusCode: 404 });
    }

    // Trigger cycle non-blocking
    schedulerService.runCycleNow(agentId).catch(err => {
      console.error(`[Force Cycle] Error for ${agentId}:`, err);
    });

    res.json({ message: 'Autonomous cycle triggered', agentId });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to force cycle', statusCode: 500 });
  }
});

router.put('/persona/:agentId', jwtMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { voiceGuide } = z.object({ voiceGuide: z.string().min(1) }).parse(req.body);

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return res.status(404).json({ error: 'Not Found', message: 'Agent not found', statusCode: 404 });
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: { voiceGuide, systemPrompt: voiceGuide },
    });

    res.json({ message: 'Persona voice guide updated' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation Error', message: error.errors?.[0]?.message, statusCode: 400 });
    }
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update persona', statusCode: 500 });
  }
});

export default router;
