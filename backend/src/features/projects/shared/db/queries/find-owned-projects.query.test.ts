import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: {
    project: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../../../../../shared/db/prisma.client';
import {
  buildFindOwnedProjectsOrderBy,
  buildFindOwnedProjectsWhere,
  findOwnedProjects,
} from './find-owned-projects.query';

describe('findOwnedProjects query builders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes projects to the owner, active state, and requested filters', () => {
    expect(
      buildFindOwnedProjectsWhere('user-123', {
        isFavorite: true,
        isArchived: true,
        color: '#D9F2FF',
      })
    ).toEqual({
      userId: 'user-123',
      deletedAt: null,
      isArchived: true,
      isFavorite: true,
      color: { equals: '#D9F2FF', mode: 'insensitive' },
    });

    expect(buildFindOwnedProjectsWhere('user-123')).toEqual({
      userId: 'user-123',
      deletedAt: null,
      isArchived: false,
    });
  });

  it.each(['sortOrder', 'name', 'createdAt', 'updatedAt'] as const)(
    'orders by %s in both directions with a stable ID tie-breaker',
    (orderBy) => {
      for (const orderDirection of ['asc', 'desc'] as const) {
        expect(
          buildFindOwnedProjectsOrderBy({ orderBy, orderDirection })
        ).toEqual([{ [orderBy]: orderDirection }, { id: 'asc' }]);
      }
    }
  );

  it('keeps the legacy array response when no limit is requested', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);

    await expect(findOwnedProjects('user-123')).resolves.toEqual([]);
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        deletedAt: null,
        isArchived: false,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    expect(prisma.project.count).not.toHaveBeenCalled();
  });

  it('returns a limited page and the total matching count', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);
    vi.mocked(prisma.project.count).mockResolvedValue(6);

    await expect(
      findOwnedProjects('user-123', { limit: 2, orderBy: 'name' })
    ).resolves.toEqual({ projects: [], total: 6 });
    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        deletedAt: null,
        isArchived: false,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 2,
    });
    expect(prisma.project.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-123',
        deletedAt: null,
        isArchived: false,
      },
    });
  });
});
