import type { RequestHandler } from 'express';
import type { CurrentUpcomingTasksService } from './current-upcoming-tasks.service';
import type { CurrentUpcomingQuery } from './types/current-upcoming-query.types';

export function createCurrentUpcomingTasksController(
  service: CurrentUpcomingTasksService
): { list: RequestHandler } {
  return {
    list: async (req, res, next) => {
      try {
        const { days } = res.locals.validated as CurrentUpcomingQuery;
        const tasks = await service.list(req.auth!.userId, days);
        res.status(200).json({ tasks });
      } catch (error) {
        next(error);
      }
    },
  };
}
