import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../shared/db/prisma.client', () => ({
  prisma: {
    project: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '../../../../../shared/db/prisma.client';
import { setProjectArchived } from './set-project-archived.query';

describe('setProjectArchived query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets the archive timestamp with the legacy flag', async () => {
    vi.mocked(prisma.project.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.project.findFirst).mockResolvedValue({
      id: 7,
      userId: 'user-123',
      name: 'Planning',
      description: null,
      color: null,
      isInbox: false,
      isFavorite: false,
      isArchived: true,
      archivedAt: new Date('2026-11-10T09:30:00.000Z'),
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await setProjectArchived(7, 'user-123', true);

    const query = vi.mocked(prisma.project.updateMany).mock.calls[0]?.[0];
    expect(query).toBeDefined();
    if (!query) throw new Error('Expected the project update query');
    expect(query).toMatchObject({
      where: {
        id: 7,
        userId: 'user-123',
        deletedAt: null,
        isInbox: false,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(result?.archivedAt).toEqual(new Date('2026-11-10T09:30:00.000Z'));
  });

  it('clears the archive timestamp when restoring a project', async () => {
    vi.mocked(prisma.project.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.project.findFirst).mockResolvedValue({
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
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await setProjectArchived(7, 'user-123', false);

    expect(prisma.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 7,
          userId: 'user-123',
          deletedAt: null,
          isArchived: true,
        },
        data: expect.objectContaining({
          isArchived: false,
          archivedAt: null,
        }),
      })
    );
  });
});
