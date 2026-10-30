import type { RequestHandler } from 'express';
import { LabelNameTakenError } from './errors/label-name-taken.error';
import { LabelNotFoundError } from './errors/label-not-found.error';
import type { LabelCrudService } from './label-crud.service';
import type {
  CreateLabelInput,
  UpdateLabelInput,
} from './types/label-crud.types';

export function createLabelCrudController(service: LabelCrudService): {
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
    if (error instanceof LabelNameTakenError) {
      res.status(409).json({
        code: 'label-name-taken',
        error: error.message,
      });
      return;
    }
    if (error instanceof LabelNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  };

  return {
    create: async (req, res, next) => {
      try {
        const label = await service.create(
          req.auth!.userId,
          res.locals.validated as CreateLabelInput
        );
        res.status(201).json(label);
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
        const labelId = res.locals.validated as number;
        const label = await service.get(labelId, req.auth!.userId);
        res.status(200).json(label);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    update: async (req, res, next) => {
      try {
        const labelId = res.locals.validatedLabelId as number;
        const label = await service.update(
          labelId,
          req.auth!.userId,
          res.locals.validated as UpdateLabelInput
        );
        res.status(200).json(label);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    delete: async (req, res, next) => {
      try {
        const labelId = res.locals.validated as number;
        await service.delete(labelId, req.auth!.userId);
        res.status(204).end();
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
