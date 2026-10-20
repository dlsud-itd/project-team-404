import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  WEB_APP_URL: z.string().url().default('http://localhost:4200'),
  BREVO_API_KEY: z.string().min(1).optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().min(1).default('HabitTracker'),
  CORS_ALLOWED_ORIGINS: z
  .string()
  .default('http://localhost:4200')
  .transform((value) =>
    value.split(',').map((origin) => origin.trim()).filter(Boolean)
  ),
});


export const env = schema.parse(process.env);
