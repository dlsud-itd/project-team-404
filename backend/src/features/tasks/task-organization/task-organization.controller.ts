import type { RequestHandler } from 'express';
import { LabelNotFoundError } from '../../labels/label-crud/errors/label-not-found.error';
import { TaskNotFoundError } from '../task-crud/errors/task-not-found.error';
import type { TaskRecord } from '../shared/models/task.model';
import type { TaskOrganizationService } from './task-organization.service';
import type {
  AttachTaskLabelsInput,
  SetTaskPriorityInput,
} from './types/task-organization.types';

export function createTaskOrganizationController(
  service: TaskOrganizationService
): {
  setPriority: RequestHandler;
  listLabels: RequestHandler;
  attachLabels: RequestHandler;
  detachLabel: RequestHandler;
} {
  const respondToError = (
    error: unknown,
    res: Parameters<RequestHandler>[1],
    next: Parameters<RequestHandler>[2]
  ) => {
    if (
      error instanceof TaskNotFoundError ||
      error instanceof LabelNotFoundError
    ) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  };

  return {
    setPriority: async (req, res, next) => {
      try {
        const result = await service.setPriority(
          res.locals.ownedTask as TaskRecord,
          req.auth!.userId,
          (res.locals.validated as SetTaskPriorityInput).priority
        );
        res.status(200).json(result);
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    listLabels: async (req, res, next) => {
      try {
        const labels = await service.listLabels(
          res.locals.ownedTask as TaskRecord,
          req.auth!.userId
        );
        res.status(200).json(labels);
      } catch (error) {
        next(error);
      }
    },
    attachLabels: async (req, res, next) => {
      try {
        const { labelIds } = res.locals.validated as AttachTaskLabelsInput;
        const labels = await service.attachLabels(
          res.locals.ownedTask as TaskRecord,
          req.auth!.userId,
          labelIds
        );
        res.status(200).json({ labels });
      } catch (error) {
        respondToError(error, res, next);
      }
    },
    detachLabel: async (req, res, next) => {
      try {
        const labelId = res.locals.validatedLabelId as number;
        const labels = await service.detachLabel(
          res.locals.ownedTask as TaskRecord,
          req.auth!.userId,
          labelId
        );
        res.status(200).json({ labels });
      } catch (error) {
        respondToError(error, res, next);
      }
    },
  };
}
