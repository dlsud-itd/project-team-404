import type { TaskSortField } from '../../task-organization/types/task-query.types';
import type { TableColumn, TableSort } from '../types/task-view.types';

/**
 * The table's columns, left to right. Only fields GET /api/tasks can order by are sortable, so
 * the server's order is the table's order and paging never mixes two orders.
 */
export const TABLE_COLUMNS: readonly TableColumn[] = [
  { key: 'title', label: 'Title', sortField: 'title' },
  { key: 'project', label: 'Project', sortField: null },
  { key: 'priority', label: 'Priority', sortField: 'priority' },
  { key: 'labels', label: 'Labels', sortField: null },
  { key: 'scheduled', label: 'Start date', sortField: 'scheduledDate' },
  { key: 'due', label: 'End date', sortField: 'dueDate' },
  { key: 'recurrence', label: 'Recurrence', sortField: null },
  { key: 'streak', label: 'Streak', sortField: null },
  { key: 'status', label: 'Status', sortField: null },
];

/**
 * The sort after clicking a header: a new field sorts ascending, the same field flips to
 * descending, and a third click goes back to the project's own order.
 */
export function nextTableSort(current: TableSort, field: TaskSortField): TableSort {
  if (current.orderBy !== field) return { orderBy: field, orderDirection: 'asc' };
  if (current.orderDirection === 'asc') return { orderBy: field, orderDirection: 'desc' };
  return { orderBy: null, orderDirection: 'asc' };
}

/** The header's aria-sort, or null for a column that can't sort. */
export function columnAriaSort(
  column: TableColumn,
  sort: TableSort,
): 'ascending' | 'descending' | 'none' | null {
  if (!column.sortField) return null;
  if (column.sortField !== sort.orderBy) return 'none';
  return sort.orderDirection === 'desc' ? 'descending' : 'ascending';
}

/** What a sortable header's button says it will do next, for screen readers. */
export function sortButtonLabel(column: TableColumn, sort: TableSort): string {
  const next = column.sortField ? nextTableSort(sort, column.sortField) : null;
  if (!next?.orderBy) return `Sort by ${column.label}: back to default order`;
  return `Sort by ${column.label}, ${next.orderDirection === 'asc' ? 'ascending' : 'descending'}`;
}
