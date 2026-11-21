import type { RequestHandler } from 'express';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import { TaskReorderConflictError } from '../task-organization/errors/task-reorder-conflict.error';
import { TaskNotDueYetError } from '../shared/errors/task-not-due-yet.error';
import type { TaskBoardService } from './task-board.service';
import type { BoardQuery, BoardReorderInput } from './types/task-board.types';

export function createTaskBoardController(service: TaskBoardService): {
  list: RequestHandler;
  reorder: RequestHandler;
} {
  const respondToError = (
    error: unknown,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
  ) => {
    if (error instanceof TaskNotFoundError) {
      res.status(404).json({ error: error.message, code: 'task-not-found' });
      return;
    }
    if (error instanceof TaskReorderConflictError) {
      res
        .status(409)
        .json({ error: error.message, code: 'task-reorder-conflict' });
      return;
    }
    if (error instanceof TaskNotDueYetError) {
      res.status(409).json({
        code: 'task-not-due',
        error: error.message,
        availableOn: error.availableOn,
      });
      return;
    }
    next(error);
  };

  return {
    list: async (req, res, next) => {
      try {
        const result = await service.list(
          req.auth!.userId,
          res.locals.validated as BoardQuery
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    reorder: async (req, res, next) => {
      try {
        const result = await service.move(
          req.auth!.userId,
          res.locals.validated as BoardReorderInput
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
