import { Router } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { listPriorities } from './db/queries/list-priorities.query';
import { createPriority } from './db/queries/create-priority.query';
import { getPriority } from './db/queries/get-priority.query';
import { updatePriority } from './db/queries/update-priority.query';
import { setDefaultPriority } from './db/queries/set-default-priority.query';
import { reorderPriorities } from './db/queries/reorder-priorities.query';
import { deletePriorityAndReassign } from './db/queries/delete-priority-and-reassign.query';
import { createPriorityCrudController } from './priority-crud.controller';
import { PriorityCrudService } from './priority-crud.service';
import { createPriorityValidator } from './validators/create-priority.validator';
import { updatePriorityValidator } from './validators/update-priority.validator';
import { priorityIdParamValidator } from './validators/priority-id-param.validator';
import { reorderPrioritiesValidator } from './validators/reorder-priorities.validator';
import { deletePriorityQueryValidator } from './validators/delete-priority-query.validator';

export function createPriorityCrudRouter(
  sessionService: SessionService,
  dependencies = {
    listPriorities,
    createPriority,
    getPriority,
    updatePriority,
    setDefaultPriority,
    reorderPriorities,
    deletePriorityAndReassign,
  }
): Router {
  const router = Router();
  const controller = createPriorityCrudController(
    new PriorityCrudService(dependencies)
  );
  const auth = requireAuth(sessionService);
  const validatePriorityId = validateRequest(
    priorityIdParamValidator,
    'params',
    'Priority ID must be a positive integer'
  );

  router.get('/', auth, controller.list);
  router.post(
    '/',
    auth,
    validateRequest(
      createPriorityValidator,
      'body',
      'Invalid priority details'
    ),
    controller.create
  );
  router.get('/:priorityId', auth, validatePriorityId, controller.get);
  router.put(
    '/:priorityId',
    auth,
    validatePriorityId,
    validateRequest(updatePriorityValidator, 'body', 'Invalid priority update'),
    controller.update
  );
  router.put(
    '/:priorityId/default',
    auth,
    validatePriorityId,
    controller.setDefault
  );
  router.put(
    '/reorder',
    auth,
    validateRequest(
      reorderPrioritiesValidator,
      'body',
      'Invalid priority order'
    ),
    controller.reorder
  );
  router.delete(
    '/:priorityId',
    auth,
    validatePriorityId,
    validateRequest(
      deletePriorityQueryValidator,
      'query',
      'Invalid delete priority request'
    ),
    controller.delete
  );

  return router;
}
