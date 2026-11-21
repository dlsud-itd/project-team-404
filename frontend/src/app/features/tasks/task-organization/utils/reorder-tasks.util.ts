import { moveItem } from '../../../projects/project-organization/utils/reorder-projects.util';
import { MAX_PAGE_SIZE, type TaskListFilter } from '../../task-crud/services/task.service';
import type { Task } from '../../shared/types/task.types';
import type { TaskQuery } from '../types/task-query.types';
import { activeFilterCount } from './task-query-params.util';

/**
 * A project's list with no sort picked shows the project's own (drag-and-drop) order. Only for
 * one project: positions mean nothing across projects, so the All Tasks list doesn't use this.
 */
export function withPositionOrder<T extends Partial<TaskListFilter>>(filter: T): T {
  return filter.orderBy ? filter : { ...filter, orderBy: 'position', orderDirection: 'asc' };
}

/**
 * The ids of the open tasks after moving the one at `from` to `to`, which is what
 * PUT /api/tasks/reorder needs. Null when nothing moves.
 */
export function reorderTaskIds(open: readonly Task[], from: number, to: number): number[] | null {
  const last = open.length - 1;
  if (last < 1) return null;
  const clamp = (value: number) => Math.min(Math.max(value, 0), last);
  if (clamp(from) === clamp(to)) return null;
  return moveItem(open, from, to).map((task) => task.taskId);
}

/**
 * Why the list can't be reordered right now, or null when it can. The server needs every open
 * task of the project in one request, so the list must show all of them in their own order.
 */
export function reorderBlockedReason(query: TaskQuery, openCount: number): string | null {
  // The "active" status still shows every open task, so it doesn't get in the way.
  const filters = activeFilterCount(query) - (query.status === 'active' ? 1 : 0);
  if (filters > 0) return 'Clear the filters to reorder tasks.';
  if (query.orderBy) return 'Switch the sort to Default order to reorder tasks.';
  if (openCount >= MAX_PAGE_SIZE) return 'This project has too many open tasks to reorder here.';
  return null;
}
