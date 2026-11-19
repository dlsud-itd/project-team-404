import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { createTaskCrudRouter } from './task-crud/task-crud.routes';
import type { TaskCrudDependencies } from './task-crud/task-crud.service';
import { createTaskSchedulingRouter } from './task-scheduling/task-scheduling.routes';
import { createTaskOrganizationRouter } from './task-organization/task-organization.routes';
import { createTaskStreaksRouter } from './task-streaks/task-streaks.routes';
import { createTaskTimelineRouter } from './task-timeline/task-timeline.routes';

export function createTasksRouter(
  sessionService: SessionService,
  dependencies?: TaskCrudDependencies
): Router {
  const router = Router();
  router.use(requireAuth(sessionService));
  router.use(createTaskOrganizationRouter(sessionService));
  router.use(createTaskStreaksRouter(sessionService));
  router.use(createTaskSchedulingRouter(sessionService));
  router.use(createTaskTimelineRouter(sessionService));
  router.use(createTaskCrudRouter(dependencies));
  return router;
}
