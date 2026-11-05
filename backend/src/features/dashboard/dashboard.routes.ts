import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { createCurrentUpcomingTasksRouter } from './current-upcoming-tasks/current-upcoming-tasks.routes';
import type { CurrentUpcomingTasksDependencies } from './current-upcoming-tasks/current-upcoming-tasks.service';

export function createDashboardRouter(
  sessionService: SessionService,
  dependencies?: CurrentUpcomingTasksDependencies
): Router {
  const router = Router();
  router.use(requireAuth(sessionService));
  router.use(createCurrentUpcomingTasksRouter(dependencies));
  return router;
}
