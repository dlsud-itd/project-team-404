import { Router } from 'express';
import type { SessionService } from '../auth/session/session.service';
import { requireAuth } from '../auth/session/middleware/require-auth.middleware';
import { validateRequest } from '../../shared/middleware/validate-request.middleware';
import { createSearchController } from './search.controller';
import { SearchService } from './search.service';
import type { SearchDependencies } from './search.service';
import { searchQueryValidator } from './validators/search-query.validator';

export function createSearchRouter(
  sessionService: SessionService,
  dependencies?: SearchDependencies
): Router {
  const router = Router();
  const service = new SearchService(dependencies);
  router.get(
    '/',
    requireAuth(sessionService),
    validateRequest(searchQueryValidator, 'query', 'Invalid search query'),
    createSearchController(service)
  );
  return router;
}
