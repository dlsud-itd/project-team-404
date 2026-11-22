import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { createPriorityCrudRouter } from './priority-crud/priority-crud.routes';

export function createPrioritiesRouter(sessionService: SessionService): Router {
  const router = Router();
  router.use(requireAuth(sessionService));
  router.use('/', createPriorityCrudRouter(sessionService));
  return router;
}
