import { describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service';
import type { SearchDependencies } from './search.service';

function dependencies(): SearchDependencies {
  return {
    searchTasks: vi.fn().mockResolvedValue({ items: [], total: 2 }),
    searchProjects: vi.fn().mockResolvedValue({ items: [], total: 1 }),
  };
}

describe('SearchService', () => {
  it('searches both groups with shared options by default', async () => {
    const deps = dependencies();
    const service = new SearchService(deps);

    await expect(
      service.search('user-1', {
        q: 'Orbit',
        type: 'all',
        limit: 7,
        includeArchived: true,
      })
    ).resolves.toEqual({
      tasks: { items: [], total: 2 },
      projects: { items: [], total: 1 },
    });
    expect(deps.searchTasks).toHaveBeenCalledWith('user-1', 'Orbit', 7, true);
    expect(deps.searchProjects).toHaveBeenCalledWith(
      'user-1',
      'Orbit',
      7,
      true
    );
  });

  it('does not query groups excluded by type and returns zero totals', async () => {
    const deps = dependencies();
    const service = new SearchService(deps);

    const response = await service.search('user-1', {
      q: 'Orbit',
      type: 'projects',
      limit: 10,
      includeArchived: false,
    });

    expect(deps.searchTasks).not.toHaveBeenCalled();
    expect(deps.searchProjects).toHaveBeenCalledOnce();
    expect(response.tasks).toEqual({ items: [], total: 0 });
  });
});
