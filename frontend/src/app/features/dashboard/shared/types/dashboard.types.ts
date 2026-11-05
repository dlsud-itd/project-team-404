import type { Task } from '../../../tasks/shared/types/task.types';

/**
 * Where a task stands against today (API spec v1.1, IV.A): overdue (due before today), current
 * (due today), upcoming (due later), unscheduled (no due date) or completed.
 */
export type ScheduleStatus = 'overdue' | 'current' | 'upcoming' | 'unscheduled' | 'completed';

/** Reply of GET /api/dashboard (VI.A). */
export interface DashboardSummary {
  currentCount: number;
  upcomingCount: number;
  overdueCount: number;
  completedCount: number;
}

export type DashboardLayout = 'list' | 'board' | 'gantt';
export type DashboardSortBy =
  'manual' | 'title' | 'priority' | 'dueDate' | 'deadline' | 'createdAt';
export type DashboardGroupBy = 'none' | 'project' | 'priority' | 'label' | 'dueDate' | 'status';
export type DashboardDirection = 'ASC' | 'DESC';

/**
 * Query of GET /api/dashboard/tasks (VI.B, VI.C). Every field is optional; one that is left out
 * is not sent, so the server's default applies.
 */
export interface DashboardTaskQuery {
  layout?: DashboardLayout;
  sortBy?: DashboardSortBy;
  sortDirection?: DashboardDirection;
  groupBy?: DashboardGroupBy;
  groupDirection?: DashboardDirection;
  projectIds?: readonly number[];
  priorityIds?: readonly number[];
  labelIds?: readonly number[];
  statuses?: readonly ScheduleStatus[];
  /** YYYY-MM-DD, inclusive. */
  dueFrom?: string;
  /** YYYY-MM-DD, inclusive; not earlier than dueFrom. */
  dueTo?: string;
}

/** A task as the dashboard lists it: a normal task plus its schedule status. */
export interface DashboardTask extends Task {
  status: ScheduleStatus;
}

export interface DashboardTaskGroup {
  /** The group's value, e.g. "1", "overdue", "2026-10-02" or "none". */
  key: string;
  /** Display name, e.g. "Priority 1", "Overdue" or "No label". */
  name: string;
  taskCount: number;
  tasks: DashboardTask[];
}

/** Reply of GET /api/dashboard/tasks. */
export interface DashboardTasksResponse {
  /** The options used, with the server's defaults filled in. */
  view: {
    layout: DashboardLayout;
    sortBy: DashboardSortBy;
    sortDirection: DashboardDirection;
    groupBy: DashboardGroupBy;
    groupDirection: DashboardDirection;
  };
  totalCount: number;
  groups: DashboardTaskGroup[];
}
