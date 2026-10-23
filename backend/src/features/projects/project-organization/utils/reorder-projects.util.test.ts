import { describe, expect, it } from 'vitest';
import { reorderProjects } from './reorder-projects.util';

describe('reorderProjects', () => {
  it('assigns zero-based sort orders in the requested sequence', () => {
    expect(reorderProjects([12, 4, 9])).toEqual([
      { projectId: 12, sortOrder: 0 },
      { projectId: 4, sortOrder: 1 },
      { projectId: 9, sortOrder: 2 },
    ]);
  });

  it('returns an empty ordering for an empty list', () => {
    expect(reorderProjects([])).toEqual([]);
  });
});
