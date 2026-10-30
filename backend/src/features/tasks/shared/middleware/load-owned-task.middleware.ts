import type { RequestHandler } from 'express';
import type { TaskRecord } from '../models/task.model';

type FindOwnedTask = (
  taskId: number,
  userId: string
) => Promise<TaskRecord | null>;

export function loadOwnedTaskMiddleware(
  findTask: FindOwnedTask
): RequestHandler {
  return async (req, res, next) => {
    try {
      const taskId = res.locals.validated as number;
      const task = await findTask(taskId, req.auth!.userId);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.locals.ownedTask = task;
      next();
    } catch (error) {
      next(error);
    }
  };
}
