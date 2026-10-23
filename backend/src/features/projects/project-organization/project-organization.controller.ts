import type { RequestHandler } from 'express';
import { ProjectNotFoundError } from '../project-crud/errors/project-crud.errors';
import type { ProjectRecord } from '../shared/models/project.model';
import { InboxCannotBeArchivedError } from './errors/inbox-cannot-be-archived.error';
import type { ProjectOrganizationService } from './project-organization.service';
import type {
  ReorderProjectsInput,
  SetArchivedInput,
  SetFavoriteInput,
  SetSortOrderInput,
} from './project-organization.types';

export function createProjectOrganizationController(
  service: ProjectOrganizationService
): {
  favorite: RequestHandler;
  archive: RequestHandler;
  reorder: RequestHandler;
  sortOrder: RequestHandler;
} {
  const respondToError = (
    error: unknown,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
  ) => {
    if (error instanceof ProjectNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof InboxCannotBeArchivedError) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  };

  return {
    favorite: async (req, res, next) => {
      try {
        const result = await service.setFavorite(
          res.locals.ownedProject as ProjectRecord,
          req.auth!.userId,
          (res.locals.validated as SetFavoriteInput).isFavorite
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    archive: async (req, res, next) => {
      try {
        const result = await service.setArchived(
          res.locals.ownedProject as ProjectRecord,
          req.auth!.userId,
          (res.locals.validated as SetArchivedInput).isArchived
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    reorder: async (req, res, next) => {
      try {
        const { projectIds } = res.locals.validated as ReorderProjectsInput;
        const projects = await service.reorder(projectIds, req.auth!.userId);
        res.status(200).json({
          projects,
          message: 'Project order updated successfully',
        });
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    sortOrder: async (req, res, next) => {
      try {
        const result = await service.setSortOrder(
          res.locals.ownedProject as ProjectRecord,
          req.auth!.userId,
          (res.locals.validated as SetSortOrderInput).sortOrder
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
