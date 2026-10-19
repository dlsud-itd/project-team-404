import { Router } from 'express';
import type { SessionService } from './session.service';
import { createSessionController } from './session.controller';
import { requireAuth } from './middleware/require-auth.middleware';

export function createSessionRouter(service: SessionService): Router {
  const router = Router();
  const controller = createSessionController(service);
  router.get('/me', requireAuth(service), controller.me);
  router.post('/logout', controller.logout);
  return router;
}
