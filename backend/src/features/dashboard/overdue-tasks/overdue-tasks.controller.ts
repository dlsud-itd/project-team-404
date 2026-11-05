import type { RequestHandler } from 'express';
import type { OverdueTasksService } from './overdue-tasks.service';

export function createOverdueTasksController(service: OverdueTasksService): {
  list: RequestHandler;
} {
  return {
    list: async (req, res, next) => {
      try {
        const tasks = await service.list(req.auth!.userId);
        res.status(200).json({ tasks });
      } catch (error) {
        next(error);
      }
    },
  };
}
