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
import { setTaskArchived } from './db/queries/set-task-archived.query';
import { updateTaskPositions } from './db/queries/update-task-positions.query';
import { findOwnedLabels } from './db/queries/find-owned-labels.query';
import { createTaskOrganizationController } from './task-organization.controller';
import { TaskOrganizationService } from './task-organization.service';
import type { TaskOrganizationDependencies } from './task-organization.service';
import {
  taskLabelsValidator,
  taskLabelIdValidator,
} from './validators/task-labels.validator';
import { taskPriorityValidator } from './validators/priority.validator';
import { setTaskArchivedValidator } from './validators/set-task-archived.validator';
import { reorderTasksValidator } from './validators/reorder-tasks.validator';
import { z } from 'zod';
import { prisma } from '../../../shared/db/prisma.client';
import { TaskReorderConflictError } from './errors/task-reorder-conflict.error';
import { findOwnedProject } from '../../projects/shared/db/queries/find-owned-project.query';

export function createTaskOrganizationRouter(
  sessionService: SessionService,
  dependencies: TaskOrganizationDependencies = {
    updateOwnedTask: updateTask,
    findOwnedLabels,
    attachTaskLabels,
    detachTaskLabel,
    listTaskLabels,
    findOwnedLabel,
    setTaskArchived,
    updateTaskPositions,
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
    '/reorder',
    requireAuth(sessionService),
    validateRequest(reorderTasksValidator, 'body', 'Invalid task order'),
    controller.reorder
  );

  router.get('/board', async (req, res, next) => {
    try {
      const raw = req.query.projectId;
      if (raw !== undefined) {
        const projectId = Number(raw);
        if (!Number.isInteger(projectId) || projectId <= 0) {
          res
            .status(400)
            .json({ error: 'Invalid projectId', code: 'invalid-project-id' });
          return;
        }
        const project = await findOwnedProject(projectId, req.auth!.userId);
        if (!project) {
          res
            .status(404)
            .json({ error: 'Project not found', code: 'project-not-found' });
          return;
        }
      }
      const projectId = raw === undefined ? undefined : Number(raw);
      const tasks = await prisma.task.findMany({
        where: {
          userId: req.auth!.userId,
          deletedAt: null,
          archivedAt: null,
          ...(projectId !== undefined
            ? { projectId }
            : {
                OR: [
                  { projectId: null },
                  { project: { is: { isArchived: false, deletedAt: null } } },
                ],
              }),
        },
        orderBy: [{ isDone: 'asc' }, { position: 'asc' }, { id: 'asc' }],
      });
      const map = ({ id, title, isDone, position }: any) => ({
        id,
        title,
        isDone,
        position,
      });
      if (projectId !== undefined) {
        res.status(200).json({
          projectId,
          columns: {
            active: tasks.filter((task) => !task.isDone).map(map),
            completed: tasks.filter((task) => task.isDone).map(map),
          },
        });
        return;
      }
      const projectIds = [
        ...new Set([...tasks.map((task) => task.projectId)]),
      ].sort((a, b) => (a ?? 0) - (b ?? 0));
      res.status(200).json({
        projects: projectIds.map((id) => ({
          projectId: id,
          columns: {
            active: tasks
              .filter((task) => task.projectId === id && !task.isDone)
              .map(map),
            completed: tasks
              .filter((task) => task.projectId === id && task.isDone)
              .map(map),
          },
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  const boardReorderValidator = z
    .object({
      projectId: z.number().int().positive().nullable(),
      columns: z.object({
        active: z.array(z.number().int().positive()).max(500),
        completed: z.array(z.number().int().positive()).max(500),
      }),
    })
    .strict();

  router.put(
    '/board/reorder',
    validateRequest(boardReorderValidator, 'body', 'Invalid board order'),
    async (req, res, next) => {
      try {
        const { projectId, columns } = res.locals.validated as z.infer<
          typeof boardReorderValidator
        >;
        const allIds = [...columns.active, ...columns.completed];
        if (allIds.length > 500 || new Set(allIds).size !== allIds.length) {
          res.status(400).json({
            error: 'Invalid board order',
            code: 'invalid-board-order',
          });
          return;
        }
        await prisma.$transaction(async (transaction) => {
          const tasks = await transaction.task.findMany({
            where: {
              userId: req.auth!.userId,
              projectId,
              deletedAt: null,
              archivedAt: null,
            },
            select: { id: true, isDone: true },
          });
          if (
            tasks.length !== allIds.length ||
            tasks.some((task) => !allIds.includes(task.id))
          ) {
            throw new TaskReorderConflictError();
          }
          for (const taskId of columns.active) {
            const task = tasks.find((item) => item.id === taskId);
            if (!task || task.isDone) throw new TaskReorderConflictError();
          }
          for (const taskId of columns.completed) {
            const task = tasks.find((item) => item.id === taskId);
            if (!task || !task.isDone) throw new TaskReorderConflictError();
          }
          for (const [column, ids] of [
            ['active', columns.active],
            ['completed', columns.completed],
          ] as const) {
            for (let position = 0; position < ids.length; position++) {
              await transaction.task.updateMany({
                where: {
                  id: ids[position],
                  userId: req.auth!.userId,
                  projectId,
                  deletedAt: null,
                  archivedAt: null,
                  isDone: column === 'completed',
                },
                data: { position },
              });
            }
          }
        });
        res.status(200).json({ projectId, columns });
      } catch (error) {
        if (error instanceof TaskReorderConflictError) {
          res
            .status(409)
            .json({ error: error.message, code: 'task-reorder-conflict' });
          return;
        }
        next(error);
      }
    }
  );

  router.put(
    '/:taskId/archive',
    ...base,
    validateRequest(setTaskArchivedValidator, 'body', 'isArchived is required'),
    controller.archive
  );
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
