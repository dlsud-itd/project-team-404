import type { RequestHandler } from 'express';
import type { ArchiveService } from './archive.service';
import type { ArchiveQuery } from './types/archive.types';

export function createArchiveController(service: ArchiveService): {
  list: RequestHandler;
} {
  return {
    list: async (req, res, next) => {
      try {
        const archive = await service.list(
          req.auth!.userId,
          res.locals.validated as ArchiveQuery
        );
        res.status(200).json(archive);
      } catch (error) {
        next(error);
      }
    },
  };
}
