import type { RequestHandler } from 'express';
import type { TaskTimelineService } from './task-timeline.service';
import type { TimelineQuery } from './validators/timeline-query.validator';

export function createTaskTimelineController(service: TaskTimelineService): {
  list: RequestHandler;
} {
  return {
    list: async (req, res, next) => {
      try {
        const result = await service.list(
          req.auth!.userId,
          res.locals.validated as TimelineQuery
        );
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    },
  };
}
