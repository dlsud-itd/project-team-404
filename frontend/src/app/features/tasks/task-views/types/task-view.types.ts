import type { SortDirection, TaskSortField } from '../../task-organization/types/task-query.types';

/** How a page shows its tasks. */
export type TaskView = 'list' | 'table' | 'board' | 'timeline';

/** One choice in the view switcher. */
export interface TaskViewOption {
  view: TaskView;
  label: string;
}

/** Every view, in the switcher's order. */
export const TASK_VIEW_OPTIONS: readonly TaskViewOption[] = [
  { view: 'list', label: 'List' },
  { view: 'table', label: 'Table' },
  { view: 'board', label: 'Board' },
  { view: 'timeline', label: 'Timeline' },
];

export type TableColumnKey =
  | 'title'
  | 'project'
  | 'priority'
  | 'labels'
  | 'scheduled'
  | 'due'
  | 'recurrence'
  | 'streak'
  | 'status';

/** A column of the table view. */
export interface TableColumn {
  key: TableColumnKey;
  label: string;
  /** The GET /api/tasks orderBy the header sorts by, or null when it can't sort. */
  sortField: TaskSortField | null;
}

/** The part of the task query the table's headers read and change. */
export interface TableSort {
  orderBy: TaskSortField | null;
  orderDirection: SortDirection;
}
