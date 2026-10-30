import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { findOwnedTask } from '../shared/db/queries/find-owned-task.query';
import { loadOwnedTaskMiddleware } from '../shared/middleware/load-owned-task.middleware';
import { taskIdParamValidator } from '../task-crud/validators/task-id-param.validator';
import { updateTask } from '../task-crud/db/queries/update-task.query';
import { findOwnedLabel } from '../../labels/shared/db/queries/find-owned-label.query';
import {
  attachTaskLabels,
  listTaskLabels,
} from './db/queries/attach-task-labels.query';
import { detachTaskLabel } from './db/queries/detach-task-label.query';
import { findOwnedLabels } from './db/queries/find-owned-labels.query';
import { createTaskOrganizationController } from './task-organization.controller';
import { TaskOrganizationService } from './task-organization.service';
import type { TaskOrganizationDependencies } from './task-organization.service';
import {
  taskLabelsValidator,
  taskLabelIdValidator,
} from './validators/task-labels.validator';
import { taskPriorityValidator } from './validators/priority.validator';

export function createTaskOrganizationRouter(
  sessionService: SessionService,
  dependencies: TaskOrganizationDependencies = {
    updateOwnedTask: updateTask,
    findOwnedLabels,
    attachTaskLabels,
    detachTaskLabel,
    listTaskLabels,
    findOwnedLabel,
  }
): Router {
  const router = Router();
  const controller = createTaskOrganizationController(
    new TaskOrganizationService(dependencies)
  );
  const validateTaskId = validateRequest(
    taskIdParamValidator,
    'params',
    'Task ID must be a positive integer'
  );
  const requireOwnedTask = loadOwnedTaskMiddleware(findOwnedTask);
  const base = [requireAuth(sessionService), validateTaskId, requireOwnedTask];
  const validateLabelId: RequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const result = taskLabelIdValidator.safeParse(req.params.labelId);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid label ID',
        details: result.error.issues.map(({ path, message }) => ({
          field: path.join('.'),
          message,
        })),
      });
      return;
    }
    res.locals.validatedLabelId = result.data;
    next();
  };

  router.put(
    '/:taskId/priority',
    ...base,
    validateRequest(taskPriorityValidator, 'body', 'Invalid task priority'),
    controller.setPriority
  );
  router.get('/:taskId/labels', ...base, controller.listLabels);
  router.post(
    '/:taskId/labels',
    ...base,
    validateRequest(taskLabelsValidator, 'body', 'Invalid task labels'),
    controller.attachLabels
  );
  router.delete(
    '/:taskId/labels/:labelId',
    ...base,
    validateLabelId,
    controller.detachLabel
  );

  return router;
}
