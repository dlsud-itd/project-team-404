import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import {
  createAuthRouter,
  createSessionService,
} from './features/auth/auth.routes';
import { createProjectCrudRouter } from './features/projects/project-crud/project-crud.routes';
import { createTasksRouter } from './features/tasks/tasks.routes';
import { errorHandler } from './middleware/error-handler.middleware';

export const app = express();

app.use(cors({ origin: env.CORS_ALLOWED_ORIGINS }));
app.use(express.json());

const sessions = createSessionService();
app.use('/api/auth', createAuthRouter({ sessionService: sessions }));
app.use('/api/projects', createProjectCrudRouter(sessions));
app.use('/api/tasks', createTasksRouter(sessions));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);
