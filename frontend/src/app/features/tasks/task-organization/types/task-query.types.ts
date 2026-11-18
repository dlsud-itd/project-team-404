/** The quick due-date choices in the filter bar; 'custom' uses dueFrom and dueTo. */
export type DuePreset = 'today' | 'next7' | 'overdue' | 'none' | 'custom';

export type TaskStatusFilter = 'all' | 'active' | 'completed';

export type LabelMatch = 'any' | 'all';

export type SortDirection = 'asc' | 'desc';

/** Fields GET /api/tasks can order by. */
export type TaskSortField =
  'dueDate' | 'deadline' | 'scheduledDate' | 'priority' | 'title' | 'createdAt' | 'updatedAt';

/** What the task list is filtered and sorted by. It lives in the URL; see task-query-params.util. */
export interface TaskQuery {
  /** Priority level names in lower case; a task matches any of them. */
  priorities: string[];
  labelIds: number[];
  /** Whether a task needs any or all of labelIds. */
  labelMatch: LabelMatch;
  due: DuePreset | null;
  /** YYYY-MM-DD bounds, only used when due is 'custom'. Either may be missing. */
  dueFrom: string | null;
  dueTo: string | null;
  /** true = repeating only, false = one-time only, null = both. */
  recurring: boolean | null;
  status: TaskStatusFilter;
  /** null keeps the project's own order. */
  orderBy: TaskSortField | null;
  orderDirection: SortDirection;
}

export const DEFAULT_TASK_QUERY: Readonly<TaskQuery> = {
  priorities: [],
  labelIds: [],
  labelMatch: 'any',
  due: null,
  dueFrom: null,
  dueTo: null,
  recurring: null,
  status: 'all',
  orderBy: null,
  orderDirection: 'asc',
};
