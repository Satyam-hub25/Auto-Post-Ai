import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';

import agentRoutes from './routes/agent.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting on public API endpoints
const publicLimiter = rateLimit({
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
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);

// Structured JSON error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode,
  });
});

// Start server
const PORT = config.PORT;
app.listen(PORT, async () => {
  console.log(`\n🚀 Autonomous AI Creator Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Mistral API: ${config.MISTRAL_API_KEY ? '✅ Configured' : '⚠️  Not configured (mock mode)'}`);
  console.log(`   Discovery: ${config.DISCOVERY_SOURCE}`);
  console.log(`   Schedule: ${config.CRON_INTERVAL_MIN}-${config.CRON_INTERVAL_MAX} min intervals\n`);

  // Restore cron jobs for all existing agents
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const { schedulerService } = await import('./services/scheduler.service');
    
    const agents = await prisma.agent.findMany();
    console.log(`[Boot] Found ${agents.length} existing agents. Restoring schedules...`);
    for (const agent of agents) {
      schedulerService.startAgentSchedule(agent.id).catch(err => {
        console.error(`[Boot] Failed to start schedule for agent ${agent.id}:`, err);
      });
    }
  } catch (err) {
    console.error(`[Boot] Failed to restore agent schedules:`, err);
  }
});

export default app;
