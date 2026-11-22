import type { RequestHandler } from 'express';
import type { SearchService } from './search.service';
import type { SearchQuery } from './types/search-result.types';

export function createSearchController(service: SearchService): RequestHandler {
  return async (req, res, next) => {
    try {
      const results = await service.search(
        req.auth!.userId,
        res.locals.validated as SearchQuery
      );
      res.status(200).json(results);
    } catch (error) {
      next(error);
    }
  };
}
