import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { findUserTimezone } from './db/queries/find-user-timezone.query';
import { listTasksDueBetween } from './db/queries/list-tasks-due-between.query';
import { createCurrentUpcomingTasksController } from './current-upcoming-tasks.controller';
import { CurrentUpcomingTasksService } from './current-upcoming-tasks.service';
import type { CurrentUpcomingTasksDependencies } from './current-upcoming-tasks.service';
import { currentUpcomingQueryValidator } from './validators/current-upcoming-query.validator';

export function createCurrentUpcomingTasksRouter(
  dependencies: CurrentUpcomingTasksDependencies = {
    findUserTimezone,
    listTasksDueBetween,
  }
): Router {
  const router = Router();
  const controller = createCurrentUpcomingTasksController(
    new CurrentUpcomingTasksService(dependencies)
  );

  router.get(
    '/current-upcoming-tasks',
    validateRequest(
      currentUpcomingQueryValidator,
      'query',
      'Invalid days value'
    ),
    controller.list
  );

  return router;
}
