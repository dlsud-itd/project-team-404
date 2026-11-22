import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { setLabelArchived } from './db/queries/set-label-archived.query';
import { createLabelOrganizationController } from './label-organization.controller';
import { LabelOrganizationService } from './label-organization.service';
import type { LabelOrganizationDependencies } from './label-organization.service';
import { labelIdParamValidator } from '../label-crud/validators/label-id-param.validator';
import { setLabelArchivedValidator } from './validators/set-label-archived.validator';

export function createLabelOrganizationRouter(
  sessionService: SessionService,
  dependencies: LabelOrganizationDependencies = { setLabelArchived }
): Router {
  const router = Router();
  const controller = createLabelOrganizationController(
    new LabelOrganizationService(dependencies)
  );
  const validateLabelId = validateRequest(
    labelIdParamValidator,
    'params',
    'Label ID must be a positive integer'
  );
  const captureLabelId: RequestHandler = (_req, res, next) => {
    res.locals.validatedLabelId = res.locals.validated;
    next();
  };

  router.put(
    '/:labelId/archive',
    requireAuth(sessionService),
    validateLabelId,
    captureLabelId,
    validateRequest(
      setLabelArchivedValidator,
      'body',
      'isArchived is required'
    ),
    controller.archive
  );

  return router;
}
