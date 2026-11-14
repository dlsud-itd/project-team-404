import type { ParamMap, Params } from '@angular/router';
import { addDays } from '../../../dashboard/current-upcoming-tasks/utils/group-by-day.util';
import type { TaskListFilter } from '../../task-crud/services/task.service';
import type { SortOption } from '../components/sort-menu/sort-menu';
import type {
  DuePreset,
  TaskQuery,
  TaskSortField,
  TaskStatusFilter,
} from '../types/task-query.types';

export const TASK_SORT_FIELDS: readonly TaskSortField[] = [
  'dueDate',
  'deadline',
  'scheduledDate',
  'priority',
  'title',
  'createdAt',
  'updatedAt',
];
/** The task sort menu's choices; '' keeps the list's own order. */
export const TASK_SORT_OPTIONS: readonly SortOption[] = [
  { value: '', label: 'Default order' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'scheduledDate', label: 'Scheduled' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
];

/** A sort menu value as a sort field, or null for the default order. */
export function taskSortField(value: string): TaskSortField | null {
  return TASK_SORT_FIELDS.find((field) => field === value) ?? null;
}

const DUE_PRESETS: readonly DuePreset[] = ['today', 'next7', 'overdue', 'none', 'custom'];
const STATUSES: readonly TaskStatusFilter[] = ['all', 'active', 'completed'];
/** The API's limits on how many priorities and labels one request may name. */
const MAX_PRIORITIES = 20;
const MAX_LABELS = 50;
const MAX_PRIORITY_NAME = 50;

/**
 * Reads a query from the URL. Anything unknown or malformed is ignored rather than rejected, so a
 * hand-edited link still opens. The Sprint 3 `priority` and `labelId` params are read too.
 */
export function taskQueryFromParams(params: ParamMap): TaskQuery {
  const priorities = unique(
    [...split(params.get('priorities')), ...split(params.get('priority'))]
      .map((name) => name.toLowerCase())
      .filter((name) => name.length <= MAX_PRIORITY_NAME),
  ).slice(0, MAX_PRIORITIES);
  const labelIds = unique(
    [...split(params.get('labelIds')), ...split(params.get('labelId'))]
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0),
  ).slice(0, MAX_LABELS);

  const dueFrom = isoDate(params.get('dueFrom'));
  const dueTo = isoDate(params.get('dueTo'));
  // A link with only a date range still means a custom range.
  const due = oneOf(params.get('due'), DUE_PRESETS) ?? (dueFrom || dueTo ? 'custom' : null);
  const status = oneOf(params.get('status'), STATUSES) ?? 'all';
  const recurring = params.get('recurring');
  const orderBy = oneOf(params.get('orderBy'), TASK_SORT_FIELDS);

  return {
    priorities,
    labelIds,
    labelMatch: params.get('labelMatch') === 'all' ? 'all' : 'any',
    // Overdue tasks are never completed, so the server refuses that pair; the status wins.
    due: due === 'overdue' && status === 'completed' ? null : due,
    dueFrom: due === 'custom' ? dueFrom : null,
    dueTo: due === 'custom' ? dueTo : null,
    recurring: recurring === 'true' ? true : recurring === 'false' ? false : null,
    status,
    orderBy,
    orderDirection: orderBy && params.get('orderDirection') === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * The URL params for a query. Defaults are null, which removes them when navigating with
 * queryParamsHandling 'merge', so a plain list keeps a plain URL. The Sprint 3 keys are always
 * removed because the new ones replace them.
 */
export function taskQueryToParams(query: TaskQuery): Params {
  const custom = query.due === 'custom';
  return {
    priorities: query.priorities.length ? query.priorities.join(',') : null,
    labelIds: query.labelIds.length ? query.labelIds.join(',') : null,
    labelMatch: query.labelIds.length > 1 && query.labelMatch === 'all' ? 'all' : null,
    due: query.due,
    dueFrom: custom ? query.dueFrom : null,
    dueTo: custom ? query.dueTo : null,
    recurring: query.recurring === null ? null : String(query.recurring),
    status: query.status === 'all' ? null : query.status,
    orderBy: query.orderBy,
    orderDirection: query.orderBy && query.orderDirection === 'desc' ? 'desc' : null,
    priority: null,
    labelId: null,
  };
}

/** Applies a change, keeping the query one the server accepts. The newest choice wins. */
export function updateTaskQuery(query: TaskQuery, changes: Partial<TaskQuery>): TaskQuery {
  const next = { ...query, ...changes };
  if (next.due === 'overdue' && next.status === 'completed') {
    if (changes.status === 'completed') next.due = null;
    else next.status = 'all';
  }
  if (next.due !== 'custom') {
    next.dueFrom = null;
    next.dueTo = null;
  }
  if (!next.orderBy) next.orderDirection = 'asc';
  return next;
}

/** How many filter groups are narrowing the list. Sorting is not a filter. */
export function activeFilterCount(query: TaskQuery): number {
  return [
    query.priorities.length > 0,
    query.labelIds.length > 0,
    query.due !== null && (query.due !== 'custom' || !!query.dueFrom || !!query.dueTo),
    query.recurring !== null,
    query.status !== 'all',
  ].filter(Boolean).length;
}

export function sameTaskQuery(left: TaskQuery, right: TaskQuery): boolean {
  return JSON.stringify(taskQueryToParams(left)) === JSON.stringify(taskQueryToParams(right));
}

/** A custom range whose start is after its end; the server would refuse it. */
export function hasInvalidRange(query: TaskQuery): boolean {
  return query.due === 'custom' && !!query.dueFrom && !!query.dueTo && query.dueFrom > query.dueTo;
}

/** The GET /api/tasks filter for a query, with day presets resolved against `today`. */
export function toTaskListFilter(
  query: TaskQuery,
  today: string,
): Omit<TaskListFilter, 'projectId' | 'page'> {
  const filter: Omit<TaskListFilter, 'projectId' | 'page'> = {};
  if (query.priorities.length) filter.priorities = query.priorities;
  if (query.labelIds.length) {
    filter.labelIds = query.labelIds;
    if (query.labelIds.length > 1 && query.labelMatch === 'all') filter.labelMatch = 'all';
  }
  switch (query.due) {
    case 'today':
      filter.dueFrom = today;
      filter.dueTo = today;
      break;
    case 'next7':
      filter.dueFrom = today;
      filter.dueTo = addDays(today, 6);
      break;
    case 'overdue':
      filter.overdue = true;
      break;
    case 'none':
      filter.hasDueDate = false;
      break;
    case 'custom':
      if (!hasInvalidRange(query)) {
        if (query.dueFrom) filter.dueFrom = query.dueFrom;
        if (query.dueTo) filter.dueTo = query.dueTo;
      }
      break;
  }
  if (query.recurring !== null) filter.recurring = query.recurring;
  if (query.status !== 'all') filter.status = query.status;
  if (query.orderBy) {
    filter.orderBy = query.orderBy;
    filter.orderDirection = query.orderDirection;
  }
  return filter;
}

function split(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

/** A real calendar date in YYYY-MM-DD form, or null. */
function isoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
}
