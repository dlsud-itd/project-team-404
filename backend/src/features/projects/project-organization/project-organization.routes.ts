import { Router } from 'express';
import { findOwnedProject } from '../shared/db/queries/find-owned-project.query';
import { ownedProjectMiddleware } from '../shared/middleware/owned-project.middleware';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import type { SessionService } from '../../auth/session/session.service';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import { projectIdParamValidator } from '../project-crud/validators/project-id-param.validator';
import { setProjectArchived } from './db/queries/set-project-archived.query';
import { setProjectFavorite } from './db/queries/set-project-favorite.query';
import { setProjectSortOrder } from './db/queries/set-project-sort-order.query';
import { updateProjectSortOrders } from './db/queries/update-project-sort-orders.query';
import { createProjectOrganizationController } from './project-organization.controller';
import { ProjectOrganizationService } from './project-organization.service';
import type { ProjectOrganizationDependencies } from './project-organization.service';
import { reorderProjectsValidator } from './validators/reorder-projects.validator';
import { setArchivedValidator } from './validators/set-archived.validator';
import { setFavoriteValidator } from './validators/set-favorite.validator';
import { setSortOrderValidator } from './validators/set-sort-order.validator';

export function createProjectOrganizationRouter(
  sessionService: SessionService,
  dependencies: ProjectOrganizationDependencies = {
    setProjectFavorite,
    setProjectArchived,
    setProjectSortOrder,
    updateProjectSortOrders,
  },
  findProject = findOwnedProject
): Router {
  const router = Router();
  const controller = createProjectOrganizationController(
    new ProjectOrganizationService(dependencies)
  );
  const auth = requireAuth(sessionService);
  const validateProjectId = validateRequest(
    projectIdParamValidator,
    'params',
    'Project ID must be a positive integer'
  );
  // Runs before the body is validated: it reads the project id from res.locals.validated,
  // which the body validator then replaces.
  const requireOwnedProject = ownedProjectMiddleware(findProject);

  router.put(
    '/reorder',
    auth,
    validateRequest(reorderProjectsValidator, 'body', 'Invalid project order'),
    controller.reorder
  );
  router.put(
    '/:projectId/favorite',
    auth,
    validateProjectId,
    requireOwnedProject,
    validateRequest(setFavoriteValidator, 'body', 'isFavorite is required'),
    controller.favorite
  );
  router.put(
    '/:projectId/archive',
    auth,
    validateProjectId,
    requireOwnedProject,
    validateRequest(setArchivedValidator, 'body', 'isArchived is required'),
    controller.archive
  );
  router.put(
    '/:projectId/sort-order',
    auth,
    validateProjectId,
    requireOwnedProject,
    validateRequest(
      setSortOrderValidator,
      'body',
      'Sort order must be 0 or greater'
    ),
    controller.sortOrder
  );

  return router;
}
