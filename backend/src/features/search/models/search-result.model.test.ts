import { describe, expect, it } from 'vitest';
import {
  toSearchProjectResult,
  toSearchTaskResult,
} from './search-result.model';

describe('search result models', () => {
  it('omits internal update timestamps from task and project results', () => {
    const updatedAt = new Date('2026-11-14T00:00:00.000Z');

    expect(
      toSearchTaskResult({
        id: 1,
        title: 'Search task',
        projectId: 2,
        matchedField: 'title',
        snippet: 'Search task',
        isArchived: false,
        archivedAt: null,
        updatedAt,
      })
    ).not.toHaveProperty('updatedAt');
    expect(
      toSearchProjectResult({
        id: 2,
        name: 'Search project',
        matchedField: 'name',
        snippet: 'Search project',
        isArchived: false,
        archivedAt: null,
        updatedAt,
      })
    ).not.toHaveProperty('updatedAt');
  });
});
