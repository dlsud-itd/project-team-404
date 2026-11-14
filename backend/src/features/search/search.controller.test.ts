import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { createSearchController } from './search.controller';
import type { SearchService } from './search.service';
import type { SearchQuery, SearchResponse } from './types/search-result.types';

function context(validated: SearchQuery) {
  const req = { auth: { userId: 'owner-1' } } as Request;
  const res = {
    locals: { validated },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('SearchController', () => {
  it('returns the authenticated user search response', async () => {
    const response: SearchResponse = {
      tasks: { items: [], total: 0 },
      projects: { items: [], total: 0 },
    };
    const service = {
      search: vi.fn().mockResolvedValue(response),
    } as unknown as SearchService;
    const controller = createSearchController(service);
    const query: SearchQuery = {
      q: 'Orbit',
      type: 'all',
      limit: 10,
      includeArchived: false,
    };
    const { req, res, next } = context(query);

    await controller(req, res, next);

    expect(service.search).toHaveBeenCalledWith('owner-1', query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(response);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards service failures to the error middleware', async () => {
    const error = new Error('Database unavailable');
    const service = {
      search: vi.fn().mockRejectedValue(error),
    } as unknown as SearchService;
    const controller = createSearchController(service);
    const { req, res, next } = context({
      q: 'Orbit',
      type: 'all',
      limit: 10,
      includeArchived: false,
    });

    await controller(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
