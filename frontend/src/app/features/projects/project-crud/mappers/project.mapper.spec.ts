import type { ApiProject } from '../../shared/types/project.types';
import { toProject } from './project.mapper';

describe('toProject', () => {
  it('renames id to projectId and drops the timestamps', () => {
    const api: ApiProject = {
      id: 10,
      name: 'Capstone',
      description: 'Final project',
      color: '#2563EB',
      isInbox: false,
      isFavorite: true,
      isArchived: false,
      sortOrder: 3,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T00:00:00.000Z',
    };

    expect(toProject(api)).toEqual({
      projectId: 10,
      name: 'Capstone',
      description: 'Final project',
      color: '#2563EB',
      isInbox: false,
      isFavorite: true,
      isArchived: false,
      sortOrder: 3,
    });
  });
});
