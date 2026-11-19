import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { createCurrentUpcomingTasksRouter } from './current-upcoming-tasks/current-upcoming-tasks.routes';
import type { CurrentUpcomingTasksDependencies } from './current-upcoming-tasks/current-upcoming-tasks.service';
import { createOverdueTasksRouter } from './overdue-tasks/overdue-tasks.routes';
import type { OverdueTasksDependencies } from './overdue-tasks/overdue-tasks.service';
import { createDashboardStreaksRouter } from './streaks/streaks.routes';

export function createDashboardRouter(
  sessionService: SessionService,
  currentUpcomingDependencies?: CurrentUpcomingTasksDependencies,
  overdueDependencies?: OverdueTasksDependencies
): Router {
  const router = Router();
  router.use(requireAuth(sessionService));
  router.use(createCurrentUpcomingTasksRouter(currentUpcomingDependencies));
  router.use(createOverdueTasksRouter(overdueDependencies));
  router.use(createDashboardStreaksRouter());
  return router;
}
