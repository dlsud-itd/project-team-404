import { Router } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { findOwnedProject } from '../../projects/shared/db/queries/find-owned-project.query';
import { createTaskTimelineController } from './task-timeline.controller';
import { listTimelineTasks } from './db/queries/list-timeline-tasks.query';
import { TaskTimelineService } from './task-timeline.service';
import type { TaskTimelineDependencies } from './task-timeline.service';
import { timelineQueryValidator } from './validators/timeline-query.validator';

export function createTaskTimelineRouter(
  sessionService: SessionService,
  dependencies: TaskTimelineDependencies = { listTimelineTasks }
): Router {
  const router = Router();
  const controller = createTaskTimelineController(
    new TaskTimelineService(dependencies)
  );

  router.get(
    '/timeline',
    requireAuth(sessionService),
    validateRequest(
      timelineQueryValidator,
      'query',
      'Invalid timeline parameters'
    ),
    async (req, res, next) => {
      try {
        const { projectId } = res.locals.validated;
        if (projectId !== undefined) {
          const project = await findOwnedProject(projectId, req.auth!.userId);
          if (!project || project.isArchived) {
            res
              .status(404)
              .json({ error: 'Project not found', code: 'project-not-found' });
            return;
          }
        }
        next();
      } catch (error) {
        next(error);
      }
    },
    controller.list
  );

  return router;
}
