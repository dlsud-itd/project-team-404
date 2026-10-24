import { Router } from 'express';
import { validateRequest } from '../../../shared/middleware/validate-request.middleware';
import type { SessionService } from '../../auth/session/session.service';
import { requireAuth } from '../../auth/session/middleware/require-auth.middleware';
import { findOwnedProject } from '../shared/db/queries/find-owned-project.query';
import { ownedProjectMiddleware } from '../shared/middleware/owned-project.middleware';
import { createProject } from './db/queries/create-project.query';
import { softDeleteOwnedProject } from './db/queries/soft-delete-owned-project.query';
import { updateOwnedProject } from './db/queries/update-owned-project.query';
import { createProjectCrudController } from './project-crud.controller';
import { ProjectCrudService } from './project-crud.service';
import type { ProjectCrudDependencies } from './project-crud.service';
import { findOwnedProjects } from '../shared/db/queries/find-owned-projects.query';
import { createProjectValidator } from './validators/create-project.validator';
import { listProjectsQueryValidator } from './validators/list-projects-query.validator';
import { projectIdParamValidator } from './validators/project-id-param.validator';
import { updateProjectValidator } from './validators/update-project.validator';
import { createProjectOrganizationRouter } from '../project-organization/project-organization.routes';

export function createProjectCrudRouter(
  sessionService: SessionService,
  dependencies: ProjectCrudDependencies = {
    createProject,
    findOwnedProjects,
    updateOwnedProject,
    softDeleteOwnedProject,
  }
): Router {
  const router = Router();
  const controller = createProjectCrudController(
    new ProjectCrudService(dependencies)
  );
  const auth = requireAuth(sessionService);
  const validateProjectId = validateRequest(
    projectIdParamValidator,
    'params',
    'Project ID must be a positive integer'
  );
  const requireOwnedProject = ownedProjectMiddleware(findOwnedProject);

  router.use(
    createProjectOrganizationRouter(sessionService, undefined, findOwnedProject)
  );

  router.post(
    '/',
    auth,
    validateRequest(createProjectValidator, 'body', 'Invalid project details'),
    controller.create
  );
  router.get(
    '/',
    auth,
    validateRequest(
      listProjectsQueryValidator,
      'query',
      'Invalid project filters'
    ),
    controller.list
  );
  router.get(
    '/:projectId',
    auth,
    validateProjectId,
    requireOwnedProject,
    controller.get
  );
  router.patch(
    '/:projectId',
    auth,
    validateProjectId,
    requireOwnedProject,
    validateRequest(updateProjectValidator, 'body', 'Invalid project update'),
    controller.update
  );
  router.delete(
    '/:projectId',
    auth,
    validateProjectId,
    requireOwnedProject,
    controller.delete
  );

  return router;
}
