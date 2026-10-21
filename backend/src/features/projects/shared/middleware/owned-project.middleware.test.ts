import type { Request, Response, NextFunction } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '../models/project.model';
import { ownedProjectMiddleware } from './owned-project.middleware';

const project: ProjectRecord = {
  id: 7,
  userId: 'user-123',
  name: 'Planning',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
  updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  deletedAt: null,
};

function mockContext() {
  const req = {
    auth: { userId: 'user-123', expiresAt: new Date() },
  } as Request;
  const res = {
    locals: { validated: 7 },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('ownedProjectMiddleware', () => {
  it('loads a project using the authenticated owner and validated id', async () => {
    const findProject = vi.fn().mockResolvedValue(project);
    const { req, res, next } = mockContext();

    await ownedProjectMiddleware(findProject)(req, res, next);

    expect(findProject).toHaveBeenCalledWith(7, 'user-123');
    expect(res.locals.ownedProject).toBe(project);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 404 when the project does not belong to the user or is deleted', async () => {
    const findProject = vi.fn().mockResolvedValue(null);
    const { req, res, next } = mockContext();

    await ownedProjectMiddleware(findProject)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Project not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards database errors', async () => {
    const error = new Error('database unavailable');
    const { req, res, next } = mockContext();

    await ownedProjectMiddleware(vi.fn().mockRejectedValue(error))(
      req,
      res,
      next
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});
