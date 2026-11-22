import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { findUserTimezone } from '../current-upcoming-tasks/db/queries/find-user-timezone.query';
import { listOverdueTasks } from './db/queries/list-overdue-tasks.query';
import { createOverdueTasksController } from './overdue-tasks.controller';
import { OverdueTasksService } from './overdue-tasks.service';
import type { OverdueTasksDependencies } from './overdue-tasks.service';
import { overdueQueryValidator } from './validators/overdue-query.validator';

export function createOverdueTasksRouter(
  dependencies: OverdueTasksDependencies = {
    findUserTimezone,
    listOverdueTasks,
  }
): Router {
  const router = Router();
  const controller = createOverdueTasksController(
    new OverdueTasksService(dependencies)
  );

  router.get(
    '/overdue-tasks',
    validateRequest(overdueQueryValidator, 'query', 'Invalid query values'),
    controller.list
  );

  return router;
}
