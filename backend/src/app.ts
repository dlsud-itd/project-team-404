import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import {
  createAuthRouter,
  createSessionService,
} from './features/auth/auth.routes';
import { createProjectCrudRouter } from './features/projects/project-crud/project-crud.routes';
import { createTasksRouter } from './features/tasks/tasks.routes';
import { createLabelsRouter } from './features/labels/labels.routes';
import { createDashboardRouter } from './features/dashboard/dashboard.routes';
import { createPrioritiesRouter } from './features/priorities/priorities.routes';
import { createSettingsRouter } from './features/settings/settings.routes';
import { createArchiveRouter } from './features/archive/archive.routes';
import { errorHandler } from './middleware/error-handler.middleware';

export const app = express();

app.use(
  cors({
    origin: env.CORS_ALLOWED_ORIGINS,
    exposedHeaders: ['X-Moved-Task-Count'],
  })
);
app.use(express.json());

const sessions = createSessionService();
app.use('/api/auth', createAuthRouter({ sessionService: sessions }));
app.use('/api/projects', createProjectCrudRouter(sessions));
app.use('/api/tasks', createTasksRouter(sessions));
app.use('/api/labels', createLabelsRouter(sessions));
app.use('/api/priorities', createPrioritiesRouter(sessions));
app.use('/api/settings', createSettingsRouter(sessions));
app.use('/api/dashboard', createDashboardRouter(sessions));
app.use('/api/archive', createArchiveRouter(sessions));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);
