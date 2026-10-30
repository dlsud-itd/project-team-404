import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { createTaskCrudRouter } from './task-crud/task-crud.routes';
import type { TaskCrudDependencies } from './task-crud/task-crud.service';

export function createTasksRouter(
  sessionService: SessionService,
  dependencies?: TaskCrudDependencies
): Router {
  const router = Router();
  router.use(requireAuth(sessionService));
  router.use(createTaskCrudRouter(dependencies));
  return router;
}
