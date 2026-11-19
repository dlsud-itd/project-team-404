import { Router, type RequestHandler } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { taskIdParamValidator } from '../task-crud/validators/task-id-param.validator';
import { TaskStreaksService } from './task-streaks.service';

export function createTaskStreaksRouter(
  sessionService: SessionService
): Router {
  const router = Router();
  router.use(requireAuth(sessionService));
  const service = new TaskStreaksService();

  router.get(
    '/:taskId/streak',
    validateRequest(
      taskIdParamValidator,
      'params',
      'Task ID must be a positive integer'
    ),
    (async (req, res, next) => {
      try {
        const taskId = Number(req.params.taskId);
        const result = await service.getTaskStreak(taskId, req.auth!.userId);
        if (!result) {
          res
            .status(404)
            .json({ error: 'Task not found', code: 'task-not-found' });
          return;
        }
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }) as RequestHandler
  );
  return router;
}
