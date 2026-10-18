import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import { createAuthRouter } from './features/auth/auth.routes';
import { errorHandler } from './middleware/error-handler.middleware';

export const app = express();

app.use(cors({ origin: env.CORS_ALLOWED_ORIGINS }));
app.use(express.json());

app.use('/api/auth', createAuthRouter());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);
