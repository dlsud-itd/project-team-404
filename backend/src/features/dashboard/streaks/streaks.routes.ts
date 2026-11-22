import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { TaskStreaksService } from '../../tasks/task-streaks/task-streaks.service';

const validator = z
  .object({ limit: z.coerce.number().int().min(1).max(100).default(20) })
  .strict();

export function createDashboardStreaksRouter(): Router {
  const router = Router();
  const service = new TaskStreaksService();
  router.get(
    '/streaks',
    validateRequest(validator, 'query', 'Invalid streak limit'),
    (async (req, res, next) => {
      try {
        const { limit } = res.locals.validated as { limit: number };
        const streaks = await service.listDashboardStreaks(
          req.auth!.userId,
          limit
        );
        res.status(200).json({ streaks });
      } catch (error) {
        next(error);
      }
    }) as RequestHandler
  );
  return router;
}
