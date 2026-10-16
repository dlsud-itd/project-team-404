import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import { SupabaseAuthConfigurationError } from './features/auth/auth.errors';
import { createAuthRouter } from './features/auth/auth.routes';
import { SupabaseAuthRepository } from './features/auth/auth.repository';

export const app = express();

app.use(cors({ origin: env.CORS_ALLOWED_ORIGINS }));
app.use(express.json());

app.use(
  '/api/auth',
  createAuthRouter(
    new SupabaseAuthRepository(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  ),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    console.error('Unhandled API error:', error);

    if (error instanceof SupabaseAuthConfigurationError) {
      res.status(503).json({ error: 'Authentication service is not configured' });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  },
);
