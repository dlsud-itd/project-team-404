import { describe, expect, it } from 'vitest';
import type { ProjectRecord } from './project.model';
import { toProjectModel } from './project.model';

describe('toProjectModel', () => {
  it('returns public project fields without ownership or deletion data', () => {
    const project: ProjectRecord = {
      id: 7,
      userId: 'user-123',
      name: 'Planning',
      description: null,
      color: '#123456',
      isInbox: false,
      isFavorite: true,
      isArchived: false,
      sortOrder: 1,
      createdAt: new Date('2026-10-20T00:00:00.000Z'),
      updatedAt: new Date('2026-10-21T00:00:00.000Z'),
      deletedAt: null,
    };

    expect(toProjectModel(project)).toEqual({
      id: 7,
      name: 'Planning',
      description: null,
      color: '#123456',
      isInbox: false,
      isFavorite: true,
      isArchived: false,
      sortOrder: 1,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  });
});
