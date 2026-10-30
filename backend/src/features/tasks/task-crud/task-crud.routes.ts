import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { createTaskCrudController } from './task-crud.controller';
import { TaskCrudService } from './task-crud.service';
import type { TaskCrudDependencies } from './task-crud.service';
import { createTask } from './db/queries/create-task.query';
import { findInboxProject } from './db/queries/find-inbox-project.query';
import { listTasks } from './db/queries/list-tasks.query';
import { softDeleteTask } from './db/queries/soft-delete-task.query';
import { updateTask } from './db/queries/update-task.query';
import { findOwnedProject } from '../../projects/shared/db/queries/find-owned-project.query';
import { findOwnedTask } from '../shared/db/queries/find-owned-task.query';
import { loadOwnedTaskMiddleware } from '../shared/middleware/load-owned-task.middleware';
import { createTaskValidator } from './validators/create-task.validator';
import { listTasksQueryValidator } from './validators/list-tasks-query.validator';
import { taskIdParamValidator } from './validators/task-id-param.validator';
import { updateTaskValidator } from './validators/update-task.validator';

export function createTaskCrudRouter(
  dependencies: TaskCrudDependencies = {
    createTask,
    findOwnedProject,
    findInboxProject,
    findOwnedTasks: listTasks,
    updateOwnedTask: updateTask,
    deleteOwnedTask: softDeleteTask,
  }
): Router {
  const router = Router();
  const controller = createTaskCrudController(
    new TaskCrudService(dependencies)
  );
  const validateTaskId = validateRequest(
    taskIdParamValidator,
    'params',
    'Task ID must be a positive integer'
  );
  const requireOwnedTask = loadOwnedTaskMiddleware(findOwnedTask);

  router.post(
    '/',
    validateRequest(createTaskValidator, 'body', 'Invalid task details'),
    controller.create
  );
  router.get(
    '/',
    validateRequest(listTasksQueryValidator, 'query', 'Invalid task filters'),
    controller.list
  );
  router.get('/:taskId', validateTaskId, requireOwnedTask, controller.get);
  router.put(
    '/:taskId',
    validateTaskId,
    requireOwnedTask,
    validateRequest(updateTaskValidator, 'body', 'Invalid task update'),
    controller.update
  );
  router.delete(
    '/:taskId',
    validateTaskId,
    requireOwnedTask,
    controller.delete
  );

  return router;
}
