import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { createLabelCrudRouter } from './label-crud/label-crud.routes';
import { createLabelOrganizationRouter } from './label-organization/label-organization.routes';

export function createLabelsRouter(sessionService: SessionService): Router {
  const router = Router();
  router.use(createLabelCrudRouter(sessionService));
  router.use(createLabelOrganizationRouter(sessionService));
  return router;
}
