import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/ai_creator'),
  JWT_SECRET: z.string().default('super-secret-key-change-in-prod'),
  MISTRAL_API_KEY: z.string().optional(),
  CRON_INTERVAL_MIN: z.coerce.number().default(60),
  CRON_INTERVAL_MAX: z.coerce.number().default(240),
  DISCOVERY_SOURCE: z.string().default('hackernews'),
});

export const config = configSchema.parse(process.env);
