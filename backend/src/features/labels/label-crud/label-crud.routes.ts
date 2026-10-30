import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { createLabel } from './db/queries/create-label.query';
import { deleteLabel } from './db/queries/delete-label.query';
import { listLabels } from './db/queries/list-labels.query';
import { updateLabel } from './db/queries/update-label.query';
import { findOwnedLabel } from '../shared/db/queries/find-owned-label.query';
import { createLabelCrudController } from './label-crud.controller';
import { LabelCrudService } from './label-crud.service';
import type { LabelCrudDependencies } from './label-crud.service';
import { createLabelValidator } from './validators/create-label.validator';
import { labelIdParamValidator } from './validators/label-id-param.validator';
import { updateLabelValidator } from './validators/update-label.validator';

export function createLabelCrudRouter(
  sessionService: SessionService,
  dependencies: LabelCrudDependencies = {
    createLabel,
    listLabels,
    findOwnedLabel,
    updateOwnedLabel: updateLabel,
    deleteOwnedLabel: deleteLabel,
  }
): Router {
  const router = Router();
  const controller = createLabelCrudController(
    new LabelCrudService(dependencies)
  );
  const auth = requireAuth(sessionService);
  const validateLabelId = validateRequest(
    labelIdParamValidator,
    'params',
    'Label ID must be a positive integer'
  );
  const captureLabelId: RequestHandler = (_req, res, next) => {
    res.locals.validatedLabelId = res.locals.validated;
    next();
  };

  router.post(
    '/',
    auth,
    validateRequest(createLabelValidator, 'body', 'Invalid label details'),
    controller.create
  );
  router.get('/', auth, controller.list);
  router.get('/:labelId', auth, validateLabelId, controller.get);
  router.put(
    '/:labelId',
    auth,
    validateLabelId,
    captureLabelId,
    validateRequest(updateLabelValidator, 'body', 'Invalid label update'),
    controller.update
  );
  router.delete('/:labelId', auth, validateLabelId, controller.delete);

  return router;
}
