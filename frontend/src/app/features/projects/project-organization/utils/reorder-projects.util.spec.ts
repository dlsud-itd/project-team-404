import type { Project } from '../../shared/types/project.types';
import type { SplitProjects } from '../types/project-organization.types';
import { moveItem, reorderPayload } from './reorder-projects.util';

const project = (projectId: number): Project => ({
  projectId,
  name: `Project ${projectId}`,
  description: null,
  color: null,
  isInbox: false,
  isFavorite: false,
  isArchived: false,
  sortOrder: 0,
});

const SPLIT: SplitProjects = {
  inbox: { ...project(1), isInbox: true },
  favorites: [project(10), project(11)],
  active: [project(20), project(21), project(22)],
  archived: [project(30)],
};

describe('moveItem', () => {
  it('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('clamps indexes outside the list', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 9)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('leaves the original list alone', () => {
    const list = ['a', 'b'];
    moveItem(list, 0, 1);
    expect(list).toEqual(['a', 'b']);
  });

  it('handles an empty list', () => {
    expect(moveItem([], 0, 1)).toEqual([]);
  });
});

describe('reorderPayload', () => {
  it('sends every non-Inbox id: favorites, then the rest, then archived', () => {
    const payload = reorderPayload(SPLIT, 'active', 0, 2);

    expect(payload?.request).toEqual({ projectIds: [10, 11, 21, 22, 20, 30] });
  });

  it('numbers the new order from 0, as the server does', () => {
    const payload = reorderPayload(SPLIT, 'favorites', 1, 0);

    expect(payload?.sortOrders).toEqual([
      { projectId: 11, sortOrder: 0 },
      { projectId: 10, sortOrder: 1 },
      { projectId: 20, sortOrder: 2 },
      { projectId: 21, sortOrder: 3 },
      { projectId: 22, sortOrder: 4 },
      { projectId: 30, sortOrder: 5 },
    ]);
  });

  it('only moves within the chosen group', () => {
    const payload = reorderPayload(SPLIT, 'favorites', 0, 5);

    expect(payload?.request.projectIds).toEqual([11, 10, 20, 21, 22, 30]);
  });

  it.each([
    ['favorites', 1, 1],
    ['active', 2, 9],
    ['favorites', 0, -3],
  ] as const)('returns null when nothing moves (%s %i → %i)', (group, from, to) => {
    expect(reorderPayload(SPLIT, group, from, to)).toBeNull();
  });

  it('returns null for an empty group', () => {
    expect(reorderPayload({ ...SPLIT, active: [] }, 'active', 0, 1)).toBeNull();
  });
});
