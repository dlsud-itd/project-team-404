import type { TaskOrderDirection, TaskPriority } from '../types/task-organization.types';

export interface PriorityColors {
  text: string;
  background: string;
  border: string;
}

export interface PriorityOption {
  value: TaskPriority;
  label: string;
  /** 1 is the most urgent. Lists sort by this so high-priority work comes first. */
  rank: number;
  colors: PriorityColors;
}

/** Every priority, most urgent first. */
export const PRIORITY_OPTIONS: readonly PriorityOption[] = [
  {
    value: 'high',
    label: 'High',
    rank: 1,
    colors: { text: '#B91C1C', background: '#FDECEC', border: '#DC2626' },
  },
  {
    value: 'medium',
    label: 'Medium',
    rank: 2,
    colors: { text: '#C2410C', background: '#FFF1E8', border: '#EA580C' },
  },
  {
    value: 'low',
    label: 'Low',
    rank: 3,
    colors: { text: '#1D4ED8', background: '#EEF3FE', border: '#2563EB' },
  },
];

/** Colors for a task with no priority set. */
export const NO_PRIORITY_COLORS: PriorityColors = {
  text: '#4B5563',
  background: '#FFFFFF',
  border: '#6B7280',
};

const BY_VALUE = new Map(PRIORITY_OPTIONS.map((o) => [o.value, o]));

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && BY_VALUE.has(value as TaskPriority);
}

/** "High", "Medium", "Low", or "No priority". */
export function priorityLabel(priority: TaskPriority | null | undefined): string {
  return (priority && BY_VALUE.get(priority)?.label) ?? 'No priority';
}

export function priorityColors(priority: TaskPriority | null | undefined): PriorityColors {
  return (priority && BY_VALUE.get(priority)?.colors) ?? NO_PRIORITY_COLORS;
}

/** 1 for high, 2 for medium, 3 for low; no priority ranks after all of them. */
export function priorityRank(priority: TaskPriority | null | undefined): number {
  return (priority && BY_VALUE.get(priority)?.rank) ?? PRIORITY_OPTIONS.length + 1;
}

/**
 * Compares two priorities for sorting. 'asc' puts the most urgent first, matching how a
 * priority-ordered list reads; tasks without a priority always go last.
 */
export function comparePriority(
  a: TaskPriority | null | undefined,
  b: TaskPriority | null | undefined,
  direction: TaskOrderDirection = 'asc',
): number {
  const ra = priorityRank(a);
  const rb = priorityRank(b);
  const none = PRIORITY_OPTIONS.length + 1;
  if (ra === none || rb === none) return ra - rb;
  return direction === 'asc' ? ra - rb : rb - ra;
}

/** A sorted copy of `items` by the priority `priorityOf` reads. Ties keep their order. */
export function sortByPriority<T>(
  items: readonly T[],
  priorityOf: (item: T) => TaskPriority | null | undefined,
  direction: TaskOrderDirection = 'asc',
): T[] {
  return [...items].sort((a, b) => comparePriority(priorityOf(a), priorityOf(b), direction));
}
