import { describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '../shared/models/project.model';
import { ProjectLimitReachedError } from '../project-crud/errors/project-crud.errors';
import { InboxCannotBeArchivedError } from './errors/inbox-cannot-be-archived.error';
import {
  ProjectOrganizationService,
  type ProjectOrganizationDependencies,
} from './project-organization.service';

const project: ProjectRecord = {
  id: 7,
  userId: 'user-123',
  name: 'Planning',
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  archivedAt: null,
  sortOrder: 0,
  lastAccessedAt: null,
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
  updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  deletedAt: null,
};

function dependencies() {
  return {
    countActiveProjects: vi.fn().mockResolvedValue(0),
    setProjectFavorite: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectArchived: vi
      .fn()
      .mockImplementation(
        (_projectId: number, _userId: string, isArchived: boolean) =>
          Promise.resolve({
            ...project,
            isArchived,
            archivedAt: isArchived ? new Date() : null,
          })
      ),
    setProjectSortOrder: vi.fn().mockResolvedValue({ count: 1 }),
    updateProjectSortOrders: vi
      .fn()
      .mockResolvedValue([{ projectId: 7, sortOrder: 0 }]),
  } satisfies ProjectOrganizationDependencies;
}

describe('ProjectOrganizationService', () => {
  it('sets and clears favorites', async () => {
    const deps = dependencies();
    const service = new ProjectOrganizationService(deps);

    await expect(
      service.setFavorite(project, 'user-123', true)
    ).resolves.toEqual({
      projectId: 7,
      isFavorite: true,
      message: 'Project added to favorites',
    });
    await expect(
      service.setFavorite(project, 'user-123', false)
    ).resolves.toMatchObject({ isFavorite: false });
    expect(deps.setProjectFavorite).toHaveBeenCalledWith(7, 'user-123', true);
  });

  it('archives and restores projects but never archives the Inbox', async () => {
    const deps = dependencies();
    const service = new ProjectOrganizationService(deps);

    await expect(
      service.setArchived(project, 'user-123', true)
    ).resolves.toMatchObject({
      isArchived: true,
    });
    await expect(
      service.setArchived({ ...project, isInbox: true }, 'user-123', true)
    ).rejects.toBeInstanceOf(InboxCannotBeArchivedError);
    expect(deps.setProjectArchived).toHaveBeenCalledOnce();
  });

  it('refuses to restore an archived project at the active-project limit', async () => {
    const deps = dependencies();
    const service = new ProjectOrganizationService(deps);
    const archived = { ...project, isArchived: true, archivedAt: new Date() };

    deps.countActiveProjects.mockResolvedValue(10);
    await expect(
      service.setArchived(archived, 'user-123', false)
    ).rejects.toBeInstanceOf(ProjectLimitReachedError);
    expect(deps.setProjectArchived).not.toHaveBeenCalled();

    deps.countActiveProjects.mockResolvedValue(9);
    await expect(
      service.setArchived(archived, 'user-123', false)
    ).resolves.toMatchObject({ isArchived: false });
  });

  it('never counts when archiving, or when the project is already active', async () => {
    const deps = dependencies();
    const service = new ProjectOrganizationService(deps);
    deps.countActiveProjects.mockResolvedValue(10);

    await service.setArchived(project, 'user-123', true);
    await service.setArchived(project, 'user-123', false);

    expect(deps.countActiveProjects).not.toHaveBeenCalled();
    expect(deps.setProjectArchived).toHaveBeenCalledTimes(2);
  });

  it('updates one sort order and delegates atomic list reordering', async () => {
    const deps = dependencies();
    const service = new ProjectOrganizationService(deps);

    await expect(
      service.setSortOrder(project, 'user-123', 2)
    ).resolves.toMatchObject({ projectId: 7, sortOrder: 2 });
    await expect(service.reorder([7], 'user-123')).resolves.toEqual([
      { projectId: 7, sortOrder: 0 },
    ]);
    expect(deps.updateProjectSortOrders).toHaveBeenCalledWith([7], 'user-123');
  });
});
