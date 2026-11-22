import type { RequestHandler } from 'express';
import { LabelNotFoundError } from '../label-crud/errors/label-not-found.error';
import type { LabelOrganizationService } from './label-organization.service';

export function createLabelOrganizationController(
  service: LabelOrganizationService
): { archive: RequestHandler } {
  return {
    archive: async (req, res, next) => {
      try {
        const label = await service.setArchived(
          res.locals.validatedLabelId as number,
          req.auth!.userId,
          (res.locals.validated as { isArchived: boolean }).isArchived
        );
        res.status(200).json(label);
      } catch (error) {
        if (error instanceof LabelNotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
  };
}
