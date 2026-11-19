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
import { z } from 'zod';
import { prisma } from '../../../shared/db/prisma.client';

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
  router.get('/timeline', async (req, res, next) => {
    try {
      const validator = z
        .object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          projectId: z.coerce.number().int().positive().optional(),
          includeCompleted: z
            .enum(['true', 'false'])
            .optional()
            .default('false'),
        })
        .strict();
      const parsed = validator.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Invalid timeline parameters',
          code: 'invalid-timeline-parameters',
        });
        return;
      }
      const { from, to, projectId, includeCompleted } = parsed.data;
      const start = new Date(`${from}T00:00:00.000Z`);
      const end = new Date(`${to}T00:00:00.000Z`);
      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start > end ||
        (end.getTime() - start.getTime()) / 86_400_000 > 365
      ) {
        res.status(400).json({
          error: 'Invalid timeline range',
          code: 'invalid-timeline-range',
        });
        return;
      }
      if (
        projectId !== undefined &&
        !(await findOwnedProject(projectId, req.auth!.userId))
      ) {
        res
          .status(404)
          .json({ error: 'Project not found', code: 'project-not-found' });
        return;
      }
      const inRange = {
        gte: start,
        lte: end,
      };
      const tasks = await prisma.task.findMany({
        where: {
          userId: req.auth!.userId,
          deletedAt: null,
          archivedAt: null,
          ...(projectId !== undefined ? { projectId } : {}),
          ...(includeCompleted === 'false' ? { isDone: false } : {}),
          AND: [
            {
              OR: [
                { projectId: null },
                { project: { is: { isArchived: false, deletedAt: null } } },
              ],
            },
            {
              OR: [
                { scheduledDate: inRange },
                { dueDate: inRange },
                { deadline: inRange },
              ],
            },
          ],
        },
        orderBy: [{ scheduledDate: 'asc' }, { dueDate: 'asc' }, { id: 'asc' }],
      });
      res.status(200).json({
        from,
        to,
        tasks: tasks.map((task) => ({
          id: task.id,
          projectId: task.projectId,
          title: task.title,
          scheduledDate: task.scheduledDate?.toISOString().slice(0, 10) ?? null,
          dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
          deadline: task.deadline?.toISOString() ?? null,
          isDone: task.isDone,
        })),
      });
    } catch (error) {
      next(error);
    }
  });
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
