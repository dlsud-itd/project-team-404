import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../shared/middleware/validate-request.middleware';
import { createArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';
import type { ArchiveDependencies } from './archive.service';
import { archiveQueryValidator } from './validators/archive-query.validator';

export function createArchiveRouter(
  sessionService: SessionService,
  dependencies?: ArchiveDependencies
): Router {
  const router = Router();
  const controller = createArchiveController(
    dependencies ? new ArchiveService(dependencies) : new ArchiveService()
  );
  router.get(
    '/',
    requireAuth(sessionService),
    validateRequest(archiveQueryValidator, 'query', 'Invalid archive query'),
    controller.list
  );
  return router;
}
