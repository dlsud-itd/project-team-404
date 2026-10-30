import { Router } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { taskIdParamValidator } from '../task-crud/validators/task-id-param.validator';
import { loadOwnedTaskMiddleware } from '../shared/middleware/load-owned-task.middleware';
import { findOwnedTask } from '../shared/db/queries/find-owned-task.query';
import { createTaskSchedulingController } from './task-scheduling.controller';
import { TaskSchedulingService } from './task-scheduling.service';
import type { TaskSchedulingDependencies } from './task-scheduling.service';
import { updateTaskSchedule } from './db/queries/update-task-schedule.query';
import { scheduleTaskDateValidator } from './validators/schedule-task-date.validator';
import { taskDueDateValidator } from './validators/task-due-date.validator';
import { taskDeadlineValidator } from './validators/task-deadline.validator';
import { recurrenceRuleValidator } from './validators/recurrence-rule.validator';

export function createTaskSchedulingRouter(
  sessionService: SessionService,
  dependencies: TaskSchedulingDependencies = {
    updateTaskSchedule,
  }
): Router {
  const router = Router();
  const controller = createTaskSchedulingController(
    new TaskSchedulingService(dependencies)
  );
  const validateTaskId = validateRequest(
    taskIdParamValidator,
    'params',
    'Task ID must be a positive integer'
  );
  const requireOwnedTask = loadOwnedTaskMiddleware(findOwnedTask);

  router.put(
    '/:taskId/schedule',
    requireAuth(sessionService),
    validateTaskId,
    requireOwnedTask,
    validateRequest(scheduleTaskDateValidator, 'body', 'Invalid scheduled date'),
    controller.setScheduledDate
  );
  router.put(
    '/:taskId/due-date',
    requireAuth(sessionService),
    validateTaskId,
    requireOwnedTask,
    validateRequest(taskDueDateValidator, 'body', 'Invalid due date'),
    controller.setDueDate
  );
  router.put(
    '/:taskId/deadline',
    requireAuth(sessionService),
    validateTaskId,
    requireOwnedTask,
    validateRequest(taskDeadlineValidator, 'body', 'Invalid deadline'),
    controller.setDeadline
  );
  router.put(
    '/:taskId/recurrence',
    requireAuth(sessionService),
    validateTaskId,
    requireOwnedTask,
    validateRequest(recurrenceRuleValidator, 'body', 'Invalid recurrence rule'),
    controller.setRecurrence
  );

  return router;
}
