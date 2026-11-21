import type { Task } from '../../shared/types/task.types';
import { DEFAULT_TASK_QUERY, type TaskQuery } from '../types/task-query.types';
import { reorderBlockedReason, reorderTaskIds, withPositionOrder } from './reorder-tasks.util';

const task = (taskId: number) => ({ taskId }) as Task;
const OPEN = [task(1), task(2), task(3)];
const query = (changes: Partial<TaskQuery> = {}): TaskQuery => ({
  ...DEFAULT_TASK_QUERY,
  ...changes,
});

describe('reorderTaskIds', () => {
  it('returns every open id with the task moved', () => {
    expect(reorderTaskIds(OPEN, 2, 0)).toEqual([3, 1, 2]);
    expect(reorderTaskIds(OPEN, 0, 1)).toEqual([2, 1, 3]);
  });

  it('clamps indexes past either end', () => {
    expect(reorderTaskIds(OPEN, 0, 9)).toEqual([2, 3, 1]);
    expect(reorderTaskIds(OPEN, 2, -1)).toEqual([3, 1, 2]);
  });

  it('returns null when nothing moves', () => {
    expect(reorderTaskIds(OPEN, 1, 1)).toBeNull();
    expect(reorderTaskIds(OPEN, 0, -1)).toBeNull();
    expect(reorderTaskIds(OPEN, 2, 5)).toBeNull();
    expect(reorderTaskIds([task(1)], 0, 1)).toBeNull();
    expect(reorderTaskIds([], 0, 1)).toBeNull();
  });
});

describe('reorderBlockedReason', () => {
  it('allows reordering the whole list in its own order', () => {
    expect(reorderBlockedReason(query(), 3)).toBeNull();
  });

  it('allows the active-only status, which still shows every open task', () => {
    expect(reorderBlockedReason(query({ status: 'active' }), 3)).toBeNull();
  });

  it('is blocked by any filter that can hide open tasks', () => {
    const blocked = 'Clear the filters to reorder tasks.';
    expect(reorderBlockedReason(query({ priorities: ['high'] }), 3)).toBe(blocked);
    expect(reorderBlockedReason(query({ labelIds: [7] }), 3)).toBe(blocked);
    expect(reorderBlockedReason(query({ due: 'overdue' }), 3)).toBe(blocked);
    expect(reorderBlockedReason(query({ recurring: true }), 3)).toBe(blocked);
    expect(reorderBlockedReason(query({ status: 'completed' }), 3)).toBe(blocked);
    expect(reorderBlockedReason(query({ status: 'active', recurring: false }), 3)).toBe(blocked);
  });

  it('is blocked by a sort other than the default order', () => {
    expect(reorderBlockedReason(query({ orderBy: 'title' }), 3)).toBe(
      'Switch the sort to Default order to reorder tasks.',
    );
  });

  it('is blocked when the list may be missing tasks past the first page', () => {
    expect(reorderBlockedReason(query(), 99)).toBeNull();
    expect(reorderBlockedReason(query(), 100)).toBe(
      'This project has too many open tasks to reorder here.',
    );
  });
});

describe('withPositionOrder', () => {
  it('asks for position order when no sort is picked', () => {
    const filter = { status: 'all' as const };
    expect(withPositionOrder(filter)).toEqual({
      status: 'all',
      orderBy: 'position',
      orderDirection: 'asc',
    });
  });

  it('keeps a chosen sort', () => {
    const filter = { orderBy: 'title' as const, orderDirection: 'desc' as const };
    expect(withPositionOrder(filter)).toBe(filter);
  });
});
