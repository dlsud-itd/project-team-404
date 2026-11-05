import type { ParamMap, Params } from '@angular/router';
import {
  DEFAULT_TASK_FILTERS,
  TASK_ORDER_OPTIONS,
  type TaskFilters,
  type TaskOrderBy,
} from '../types/task-organization.types';
import { isTaskPriority } from './priority.util';

/** The URL query parameter each filter is kept in, e.g. ?priority=high&label=3&sort=title&dir=desc. */
export const FILTER_QUERY_KEYS = {
  priority: 'priority',
  labelId: 'label',
  orderBy: 'sort',
  orderDirection: 'dir',
} as const;

const ORDER_BY_VALUES = new Set<string>(TASK_ORDER_OPTIONS.map((o) => o.value));

function isOrderBy(value: unknown): value is TaskOrderBy {
  return typeof value === 'string' && ORDER_BY_VALUES.has(value);
}

/** Reads one value from a ParamMap or a Params object; repeated keys use the first value. */
function read(params: ParamMap | Params, key: string): string | null {
  if (typeof params['get'] === 'function' && typeof params['has'] === 'function') {
    return (params as ParamMap).get(key);
  }
  const value: unknown = (params as Params)[key];
  const first: unknown = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' ? first : null;
}

function positiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Drops the direction when there is no ordering, since the server's default ignores it. */
function normalize(filters: TaskFilters): TaskFilters {
  return filters.orderBy === null ? { ...filters, orderDirection: 'asc' } : filters;
}

/**
 * Reads filters from the URL. Anything missing or invalid (a bad priority, label id or sort)
 * falls back to its default, so a hand-edited or stale link still opens a working list.
 */
export function queryParamsToFilters(params: ParamMap | Params): TaskFilters {
  const priority = read(params, FILTER_QUERY_KEYS.priority);
  const orderBy = read(params, FILTER_QUERY_KEYS.orderBy);
  const direction = read(params, FILTER_QUERY_KEYS.orderDirection);
  return normalize({
    priority: isTaskPriority(priority) ? priority : null,
    labelId: positiveInt(read(params, FILTER_QUERY_KEYS.labelId)),
    orderBy: isOrderBy(orderBy) ? orderBy : null,
    orderDirection: direction === 'desc' ? 'desc' : 'asc',
  });
}

/**
 * Turns filters into query params for router.navigate with queryParamsHandling 'merge'. Every
 * key is present: defaults are null, which removes them from the URL and keeps it short.
 */
export function filtersToQueryParams(filters: TaskFilters): Params {
  const f = normalize(filters);
  return {
    [FILTER_QUERY_KEYS.priority]: f.priority,
    [FILTER_QUERY_KEYS.labelId]: f.labelId === null ? null : String(f.labelId),
    [FILTER_QUERY_KEYS.orderBy]: f.orderBy,
    [FILTER_QUERY_KEYS.orderDirection]:
      f.orderBy !== null && f.orderDirection === 'desc' ? 'desc' : null,
  };
}

/** The GET /api/tasks query for these filters, leaving out everything left at its default. */
export function filtersToApiQuery(filters: TaskFilters): Record<string, string> {
  const f = normalize(filters);
  const query: Record<string, string> = {};
  if (f.priority !== null) query['priority'] = f.priority;
  if (f.labelId !== null) query['labelId'] = String(f.labelId);
  if (f.orderBy !== null) {
    query['orderBy'] = f.orderBy;
    query['orderDirection'] = f.orderDirection;
  }
  return query;
}

/** True when a priority or label narrows the list (ordering alone does not hide tasks). */
export function hasActiveFilters(filters: TaskFilters): boolean {
  return filters.priority !== null || filters.labelId !== null;
}

/** True when the filters would produce the same list and URL. */
export function sameFilters(a: TaskFilters, b: TaskFilters): boolean {
  const x = normalize(a);
  const y = normalize(b);
  return (
    x.priority === y.priority &&
    x.labelId === y.labelId &&
    x.orderBy === y.orderBy &&
    x.orderDirection === y.orderDirection
  );
}

export function isDefaultFilters(filters: TaskFilters): boolean {
  return sameFilters(filters, DEFAULT_TASK_FILTERS);
}
