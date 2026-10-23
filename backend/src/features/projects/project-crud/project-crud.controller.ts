import type { RequestHandler } from 'express';
import {
  InboxProjectMutationError,
  ProjectNotFoundError,
} from './errors/project-crud.errors';
import type { ProjectRecord } from '../shared/models/project.model';
import { toProjectModel } from '../shared/models/project.model';
import type { ProjectCrudService } from './project-crud.service';
import type {
  CreateProjectInput,
  ListProjectsFilters,
  UpdateProjectInput,
} from './project-crud.types';

export function createProjectCrudController(service: ProjectCrudService): {
  create: RequestHandler;
  list: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  delete: RequestHandler;
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
    if (error instanceof InboxProjectMutationError) {
      res.status(403).json({ error: error.message });
      return;
    }
    next(error);
  };

  return {
    create: async (req, res, next) => {
      try {
        const project = await service.create(
          req.auth!.userId,
          res.locals.validated as CreateProjectInput
        );
        res.status(201).json(project);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    list: async (req, res, next) => {
      try {
        const projects = await service.list(
          req.auth!.userId,
          res.locals.validated as ListProjectsFilters
        );
        res.status(200).json(projects);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    get: (_req, res, next) => {
      try {
        res
          .status(200)
          .json(toProjectModel(res.locals.ownedProject as ProjectRecord));
      } catch (error) {
        next(error);
      }
    },
    update: async (req, res, next) => {
      try {
        const project = await service.update(
          res.locals.ownedProject as ProjectRecord,
          req.auth!.userId,
          res.locals.validated as UpdateProjectInput
        );
        res.status(200).json(project);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    delete: async (req, res, next) => {
      try {
        await service.delete(
          res.locals.ownedProject as ProjectRecord,
          req.auth!.userId
        );
        res.status(204).end();
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
