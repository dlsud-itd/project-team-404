import { describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '../shared/models/project.model';
import {
  InboxProjectMutationError,
  ProjectNotFoundError,
} from './errors/project-crud.errors';
import { ProjectCrudService } from './project-crud.service';

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

function dependencies() {
  return {
    createProject: vi.fn().mockResolvedValue(project),
    findOwnedProjects: vi.fn().mockResolvedValue([project]),
    updateOwnedProject: vi.fn().mockResolvedValue(project),
    softDeleteOwnedProject: vi.fn().mockResolvedValue(true),
  };
}

describe('ProjectCrudService', () => {
  it('creates projects for the authenticated owner', async () => {
    const deps = dependencies();
    const service = new ProjectCrudService(deps);

    await service.create('user-123', { name: 'Planning' });

    expect(deps.createProject).toHaveBeenCalledWith('user-123', {
      name: 'Planning',
    });
  });

  it('lists only the authenticated user projects', async () => {
    const deps = dependencies();
    const service = new ProjectCrudService(deps);

    const result = await service.list('user-123', { isArchived: false });

    expect(deps.findOwnedProjects).toHaveBeenCalledWith('user-123', {
      isArchived: false,
    });
    expect(result[0]).not.toHaveProperty('userId');
    expect(result[0]).not.toHaveProperty('deletedAt');
  });

  it('updates a regular project', async () => {
    const deps = dependencies();
    const service = new ProjectCrudService(deps);

    await service.update(project, 'user-123', { name: 'Planning v2' });

    expect(deps.updateOwnedProject).toHaveBeenCalledWith(7, 'user-123', {
      name: 'Planning v2',
    });
  });

  it('prevents editing the Inbox', async () => {
    const deps = dependencies();
    const service = new ProjectCrudService(deps);

    await expect(
      service.update({ ...project, isInbox: true }, 'user-123', {
        name: 'Renamed',
      })
    ).rejects.toBeInstanceOf(InboxProjectMutationError);
    expect(deps.updateOwnedProject).not.toHaveBeenCalled();
  });

  it('soft deletes a regular project', async () => {
    const deps = dependencies();
    const service = new ProjectCrudService(deps);

    await service.delete(project, 'user-123');

    expect(deps.softDeleteOwnedProject).toHaveBeenCalledWith(7, 'user-123');
  });

  it('prevents deleting the Inbox and reports stale projects as missing', async () => {
    const deps = dependencies();
    const service = new ProjectCrudService(deps);

    await expect(
      service.delete({ ...project, isInbox: true }, 'user-123')
    ).rejects.toBeInstanceOf(InboxProjectMutationError);

    vi.mocked(deps.softDeleteOwnedProject).mockResolvedValue(false);
    await expect(service.delete(project, 'user-123')).rejects.toBeInstanceOf(
      ProjectNotFoundError
    );
  });
});
