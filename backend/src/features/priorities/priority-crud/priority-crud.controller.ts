import type { RequestHandler } from 'express';
import { PriorityNameTakenError } from './errors/priority-name-taken.error';
import { LastPriorityError } from './errors/last-priority.error';
import { ReassignRequiredError } from './errors/reassign-required.error';
import { PriorityNotFoundError } from './errors/priority-not-found.error';
import type { PriorityCrudService } from './priority-crud.service';
import type {
  CreatePriorityInput,
  UpdatePriorityInput,
  ReorderPrioritiesInput,
  DeletePriorityQuery,
} from './types/priority-crud.types';

export function createPriorityCrudController(service: PriorityCrudService): {
  create: RequestHandler;
  list: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  setDefault: RequestHandler;
  reorder: RequestHandler;
  delete: RequestHandler;
} {
  const respondToError = (
    error: unknown,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
  ) => {
    if (error instanceof PriorityNameTakenError) {
      res
        .status(409)
        .json({ code: 'priority-name-taken', error: error.message });
      return;
    }
    if (error instanceof LastPriorityError) {
      res.status(409).json({ code: 'last-priority', error: error.message });
      return;
    }
    if (error instanceof ReassignRequiredError) {
      res.status(409).json({ code: 'reassign-required', error: error.message });
      return;
    }
    if (error instanceof PriorityNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof Error) {
      next(error);
      return;
    }
    next(new Error('Unknown priority error'));
  };

  return {
    create: async (req, res, next) => {
      try {
        const priority = await service.create(
          req.auth!.userId,
          req.body as CreatePriorityInput
        );
        res.status(201).json(priority);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    list: async (req, res, next) => {
      try {
        res.status(200).json(await service.list(req.auth!.userId));
      } catch (error) {
        next(error);
      }
    },
    get: async (req, res, next) => {
      try {
        const priorityId = Number(req.params.priorityId);
        res.status(200).json(await service.get(priorityId, req.auth!.userId));
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    update: async (req, res, next) => {
      try {
        const priorityId = Number(req.params.priorityId);
        const priority = await service.update(
          priorityId,
          req.auth!.userId,
          req.body as UpdatePriorityInput
        );
        res.status(200).json(priority);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    setDefault: async (req, res, next) => {
      try {
        const priorityId = Number(req.params.priorityId);
        const priority = await service.setDefault(priorityId, req.auth!.userId);
        res.status(200).json(priority);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    reorder: async (req, res, next) => {
      try {
        const priorities = await service.reorder(
          req.auth!.userId,
          req.body as ReorderPrioritiesInput
        );
        res.status(200).json(priorities);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    delete: async (req, res, next) => {
      try {
        const priorityId = Number(req.params.priorityId);
        const query = res.locals.validated as DeletePriorityQuery;
        const priority = await service.delete(
          priorityId,
          req.auth!.userId,
          query
        );
        res.status(200).json(priority);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
