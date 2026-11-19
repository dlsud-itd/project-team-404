import { Router } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { findOwnedProject } from '../../projects/shared/db/queries/find-owned-project.query';
import { listBoardTasks } from './db/queries/list-board-tasks.query';
import { moveBoardTask } from './db/queries/move-board-task.query';
import { createTaskBoardController } from './task-board.controller';
import { TaskBoardService } from './task-board.service';
import type { TaskBoardDependencies } from './task-board.service';
import { boardQueryValidator } from './validators/board-query.validator';
import { boardReorderValidator } from './validators/board-reorder.validator';

export function createTaskBoardRouter(
  sessionService: SessionService,
  dependencies: TaskBoardDependencies = {
    findOwnedProject,
    listBoardTasks,
    moveBoardTask,
  }
): Router {
  const router = Router();
  const controller = createTaskBoardController(
    new TaskBoardService(dependencies)
  );
  router.use(requireAuth(sessionService));

  router.get(
    '/board',
    validateRequest(boardQueryValidator, 'query', 'Invalid board filters'),
    controller.list
  );
  router.put(
    '/board/reorder',
    validateRequest(
      boardReorderValidator,
      'body',
      'Invalid board reorder request'
    ),
    controller.reorder
  );

  return router;
}
