import { describe, expect, it, vi } from 'vitest';
import type { ProjectRecord } from '../shared/models/project.model';
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
  sortOrder: 0,
  createdAt: new Date('2026-10-20T00:00:00.000Z'),
  updatedAt: new Date('2026-10-20T00:00:00.000Z'),
  deletedAt: null,
};

function dependencies(): ProjectOrganizationDependencies {
  return {
    setProjectFavorite: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectArchived: vi.fn().mockResolvedValue({ count: 1 }),
    setProjectSortOrder: vi.fn().mockResolvedValue({ count: 1 }),
    updateProjectSortOrders: vi
      .fn()
      .mockResolvedValue([{ projectId: 7, sortOrder: 0 }]),
  };
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
