import type { RequestHandler } from 'express';
import type { TaskRecord } from '../shared/models/task.model';
import { toTaskModel } from '../shared/models/task.model';
import { TaskNotFoundError } from './errors/task-crud.errors';
import type { TaskCrudService } from './task-crud.service';
import type {
  CreateTaskInput,
  ListTasksFilters,
  UpdateTaskInput,
} from './types/task-crud.types';

export function createTaskCrudController(service: TaskCrudService): {
  create: RequestHandler;
  list: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
} {
  const respondToError = (
    error: unknown,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
  ) => {
    if (error instanceof TaskNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  };

  return {
    create: async (req, res, next) => {
      try {
        const task = await service.create(
          req.auth!.userId,
          res.locals.validated as CreateTaskInput
        );
        res.status(201).json(task);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    list: async (req, res, next) => {
      try {
        const tasks = await service.list(
          req.auth!.userId,
          res.locals.validated as ListTasksFilters
        );
        res.status(200).json(tasks);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    get: (_req, res, next) => {
      try {
        res.status(200).json(toTaskModel(res.locals.ownedTask as TaskRecord));
      } catch (error) {
        next(error);
      }
    },
    update: async (req, res, next) => {
      try {
        const task = await service.update(
          res.locals.ownedTask as TaskRecord,
          req.auth!.userId,
          res.locals.validated as UpdateTaskInput
        );
        res.status(200).json({
          taskId: task.id,
          message: 'Task updated successfully',
        });
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    delete: async (req, res, next) => {
      try {
        await service.delete(
          res.locals.ownedTask as TaskRecord,
          req.auth!.userId
        );
        res.status(200).json({ message: 'Task deleted successfully' });
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
