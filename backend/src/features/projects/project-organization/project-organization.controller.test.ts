import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '../shared/models/project.model';
import { ProjectNotFoundError } from '../project-crud/errors/project-crud.errors';
import { createProjectOrganizationController } from './project-organization.controller';
import { ProjectOrganizationService } from './project-organization.service';

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

function context(validated: unknown, ownedProject?: ProjectRecord) {
  const req = {
    auth: { userId: 'user-123', expiresAt: new Date() },
  } as Request;
  const res = {
    locals: { validated, ownedProject },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

function makeController(
  dependencies = {
    setProjectFavorite: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectArchived: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectSortOrder: vi.fn().mockResolvedValue({ count: 1 }),
    updateProjectSortOrders: vi
      .fn()
      .mockResolvedValue([{ projectId: 7, sortOrder: 0 }]),
  }
) {
  return {
    controller: createProjectOrganizationController(
      new ProjectOrganizationService(dependencies)
    ),
    dependencies,
  };
}

describe('ProjectOrganizationController', () => {
  it('returns favorite and archive results', async () => {
    const { controller } = makeController();
    const favorite = context({ isFavorite: true }, project);
    await controller.favorite(favorite.req, favorite.res, favorite.next);

    expect(favorite.res.status).toHaveBeenCalledWith(200);
    expect(favorite.res.json).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 7, isFavorite: true })
    );

    const archive = context({ isArchived: true }, project);
    await controller.archive(archive.req, archive.res, archive.next);
    expect(archive.res.json).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 7, isArchived: true })
    );
  });

  it('returns ordered projects', async () => {
    const { controller } = makeController();
    const ctx = context({ projectIds: [7] });

    await controller.reorder(ctx.req, ctx.res, ctx.next);

    expect(ctx.res.status).toHaveBeenCalledWith(200);
    expect(ctx.res.json).toHaveBeenCalledWith({
      projects: [{ projectId: 7, sortOrder: 0 }],
      message: 'Project order updated successfully',
    });
  });

  it('returns the Inbox archive error and maps missing projects to 404', async () => {
    const deps = {
      setProjectFavorite: vi.fn().mockResolvedValue({ count: 1 }),
      setProjectArchived: vi.fn().mockResolvedValue({ count: 1 }),
      setProjectSortOrder: vi.fn().mockResolvedValue({ count: 1 }),
      updateProjectSortOrders: vi
        .fn()
        .mockRejectedValue(new ProjectNotFoundError()),
    };
    const { controller } = makeController(deps);
    const inbox = context({ isArchived: true }, { ...project, isInbox: true });
    await controller.archive(inbox.req, inbox.res, inbox.next);
    expect(inbox.res.status).toHaveBeenCalledWith(400);
    expect(inbox.res.json).toHaveBeenCalledWith({
      error: 'Inbox project cannot be archived',
    });

    const missing = context({ projectIds: [99] });
    await controller.reorder(missing.req, missing.res, missing.next);
    expect(missing.res.status).toHaveBeenCalledWith(404);
    expect(missing.res.json).toHaveBeenCalledWith({
      error: 'Project not found',
    });
  });
});
