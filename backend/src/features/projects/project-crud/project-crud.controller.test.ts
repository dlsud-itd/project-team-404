import type { Request, Response, NextFunction } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '../shared/models/project.model';
import { ProjectCrudService } from './project-crud.service';
import type { ProjectCrudDependencies } from './project-crud.service';
import { createProjectCrudController } from './project-crud.controller';

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

function context(validated: unknown = undefined, ownedProject?: ProjectRecord) {
  const req = {
    auth: { userId: 'user-123', expiresAt: new Date() },
  } as Request;
  const res = {
    locals: { validated, ownedProject },
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

function service() {
  const dependencies: ProjectCrudDependencies = {
    createProject: vi.fn().mockResolvedValue(project),
    findOwnedProjects: vi.fn().mockResolvedValue([project]),
    updateOwnedProject: vi.fn().mockResolvedValue(project),
    softDeleteOwnedProject: vi.fn().mockResolvedValue(true),
  };
  return new ProjectCrudService(dependencies);
}

describe('ProjectCrudController', () => {
  it('creates projects with status 201', async () => {
    const controller = createProjectCrudController(service());
    const { req, res, next } = context({ name: 'Planning' });

    await controller.create(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, name: 'Planning' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns an owned project without private fields', () => {
    const controller = createProjectCrudController(service());
    const { req, res, next } = context(undefined, project);

    controller.get(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.not.objectContaining({ userId: 'user-123', deletedAt: null })
    );
  });

  it('returns 204 after deletion', async () => {
    const controller = createProjectCrudController(service());
    const { req, res, next } = context(undefined, project);

    await controller.delete(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalledOnce();
  });
});
