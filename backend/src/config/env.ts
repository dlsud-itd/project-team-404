import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CORS_ALLOWED_ORIGINS: z
  .string()
  .default('http://localhost:4200')
  .transform((value) =>
    value.split(',').map((origin) => origin.trim()).filter(Boolean)
  ),
});


export const env = schema.parse(process.env);
